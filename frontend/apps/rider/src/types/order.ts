export interface OrderItem {
  id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  thumbnail_url: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  customer_id: string;
  business_id: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  business_name?: string | null;
  business_logo?: string | null;
  pickup_location?: { lat: any; lon: any } | null;
  delivery_location?: { lat: any; lon: any } | null;
  items: OrderItem[];
}
