import React, { createContext, useContext, useCallback, useState } from 'react';
export interface BusinessCard {
  id: string;
  name: string;
  category_name: string;
  description: string | null;
  trust_score: number;
  logo_url: string | null;
  slug: string | null;
  distance_meters: number | null;
  location: { lat: number; lon: number } | null;
  address_text: string | null;
  cover_url: string;
  snippet_title?: string | null;
  snippet_products?: { id: string; name: string; image_url?: string | null }[];
  operating_hours: {
    day_of_week: number;
    opens_at: string | null;
    closes_at: string | null;
    is_closed: boolean;
  }[];
}
interface FeedState {
  businesses: BusinessCard[];
  nextCursor: string | null;
  searchText: string;
  selectedCategory: number | undefined;
  location: { lat: number; lon: number } | null;
  gpsEnabled: boolean;
  locationEnabled: boolean;
  radiusMeters: number;
  /** id of the business card that was nearest the top of the viewport when we last left the feed.
   *  We restore scroll position by re-locating this card rather than replaying a raw pixel offset,
   *  so restoration stays correct even if card heights/spacing change between visits. */
  scrollAnchorId: string | null;
}
interface FeedActions {
  setAllBusinesses: (biz: BusinessCard[]) => void;
  appendBusinesses: (incoming: BusinessCard[]) => void;
  setNextCursor: (c: string | null) => void;
  setSearchText: (s: string) => void;
  setSelectedCategory: (c: number | undefined) => void;
  setLocation: (l: { lat: number; lon: number } | null) => void;
  setGpsEnabled: (v: boolean) => void;
  setLocationEnabled: (v: boolean) => void;
  setRadiusMeters: (r: number) => void;
  /** Save the id of whichever business card is currently nearest the top of the viewport. */
  saveScrollAnchor: (businessId: string | null) => void;
  resetFeed: () => void;
}
const CustomerFeedContext = createContext<(FeedState & FeedActions) | null>(null);
export const useFeedContext = () => {
  const ctx = useContext(CustomerFeedContext);
  if (!ctx) throw new Error('useFeedContext must be used within CustomerFeedProvider');
  return ctx;
};
export const CustomerFeedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [businesses, setAllBusinesses] = useState<BusinessCard[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [radiusMeters, setRadiusMeters] = useState(5000);
  const [scrollAnchorId, setScrollAnchorId] = useState<string | null>(null);
  const appendBusinesses = useCallback((incoming: BusinessCard[]) => {
    setAllBusinesses(prev => {
      const map = new Map(prev.map(b => [b.id, b]));
      for (const b of incoming) map.set(b.id, b);
      const merged = Array.from(map.values());
      if (merged.length > 200) return merged.slice(-200);
      return merged;
    });
  }, []);
  const resetFeed = useCallback(() => {
    setAllBusinesses([]);
    setNextCursor(null);
  }, []);
  const saveScrollAnchor = useCallback((businessId: string | null) => {
    setScrollAnchorId(businessId);
  }, []);
  const value: FeedState & FeedActions = {
    businesses, nextCursor,
    searchText, selectedCategory,
    location, gpsEnabled, locationEnabled, radiusMeters,
    scrollAnchorId,
    setAllBusinesses, appendBusinesses, setNextCursor,
    setSearchText, setSelectedCategory,
    setLocation, setGpsEnabled, setLocationEnabled, setRadiusMeters,
    saveScrollAnchor, resetFeed,
  };
  return React.createElement(CustomerFeedContext.Provider, { value }, children);
};