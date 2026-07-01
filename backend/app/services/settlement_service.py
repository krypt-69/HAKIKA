from app.repositories.settlement_repository import SettlementRepository
from app.repositories.ledger_repository import LedgerRepository
from app.repositories.business_repository import BusinessRepository
from app.repositories.payment_method_repository import PaymentMethodRepository
from app.models.settlement import SettlementStatus
from app.models.ledger_entry import LedgerTransactionType
from app.integrations.intasend.client import IntaSendClient
from app.models.audit_log import AuditLog
from fastapi import HTTPException, status
import uuid

class SettlementService:
    def __init__(
        self,
        settlement_repo: SettlementRepository,
        ledger_repo: LedgerRepository,
        business_repo: BusinessRepository,
        payment_method_repo: PaymentMethodRepository
    ):
        self.settlement_repo = settlement_repo
        self.ledger_repo = ledger_repo
        self.business_repo = business_repo
        self.payment_method_repo = payment_method_repo
        self.intasend = IntaSendClient()

    async def process_settlement(self, settlement_id: uuid.UUID, admin_id: uuid.UUID) -> dict:
        settlement = await self.settlement_repo.get_by_id(settlement_id)
        if not settlement:
            raise HTTPException(status_code=404, detail="Settlement not found")
        if settlement.status != SettlementStatus.pending:
            raise HTTPException(status_code=400, detail="Settlement cannot be processed")
        if settlement.retry_count >= 3:
            raise HTTPException(status_code=400, detail="Max retries exceeded")

        await self.settlement_repo.update_status(settlement, SettlementStatus.processing)

        try:
            # Get business payment destination
            methods = await self.payment_method_repo.get_by_business(settlement.business_id)
            if not methods:
                raise ValueError("No payment method configured for this business")
            method = methods[0]  # use the first active payment method

            # Get business name
            business = await self.business_repo.get_by_id(settlement.business_id)
            business_name = business.name if business else "Business"

            # Call real IntaSend B2B payout
            response = await self.intasend.send_b2b_payout(
                amount=float(settlement.amount),
                account_number=method.encrypted_account_number,  # In production this should be decrypted
                account_type="PayBill" if method.type.value == "paybill" else "Till",
                account_reference=f"HAKIKA-{str(settlement.id)[:8].upper()}",
                business_name=business_name
            )

            # Extract references from IntaSend response
            file_id = response.get("file_id")
            tracking_id = response.get("tracking_id")
            transaction_id = None
            if response.get("transactions"):
                transaction_id = response["transactions"][0].get("transaction_id")

            # Update settlement with real references and mark completed
            await self.settlement_repo.update_status(
                settlement,
                SettlementStatus.completed,
                provider_reference=file_id or tracking_id
            )
            # Store tracking details
            settlement.provider_reference = file_id
            await self.settlement_repo.db.commit()

            # Create ledger entry for the payout
            await self.ledger_repo.create_entry(
                LedgerTransactionType.business_settlement,
                -float(settlement.amount),
                order_id=settlement.order_id,
                payment_id=settlement.payment_id,
                business_id=settlement.business_id
            )

            # Audit log
            audit = AuditLog(
                table_name='settlements',
                record_id=settlement.id,
                action='ADMIN_SETTLEMENT_COMPLETED',
                changed_by=admin_id,
                new_values={
                    "status": "completed",
                    "file_id": file_id,
                    "tracking_id": tracking_id,
                    "transaction_id": transaction_id
                }
            )
            self.settlement_repo.db.add(audit)
            await self.settlement_repo.db.commit()

            return {
                "status": "completed",
                "file_id": file_id,
                "tracking_id": tracking_id,
                "transaction_id": transaction_id
            }

        except Exception as e:
            await self.settlement_repo.update_status(settlement, SettlementStatus.failed)
            audit = AuditLog(
                table_name='settlements',
                record_id=settlement.id,
                action='ADMIN_SETTLEMENT_FAILED',
                changed_by=admin_id,
                new_values={"status": "failed", "error": str(e)}
            )
            self.settlement_repo.db.add(audit)
            await self.settlement_repo.db.commit()
            raise HTTPException(status_code=500, detail=f"Settlement failed: {str(e)}")

    async def get_settlements_for_business(self, business_id: uuid.UUID):
        return await self.settlement_repo.get_by_business(business_id)
