import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { shipmentApi } from '../api/shipmentApi';
import { Shipment } from '../types/shipment';
import { filterShipmentItems } from '../utils/partitionMath';

export function useShipmentSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(urlQuery);
  const [field, setField] = useState('all');
  const [activeTab, setActiveTab] = useState<'all' | 'missing' | 'complete'>('all');
  const [selectedJob, setSelectedJob] = useState<Shipment | null>(null);

  useEffect(() => {
    if (urlQuery !== query) {
      setQuery(urlQuery);
    }
  }, [urlQuery]);

  const { data = [], isLoading, error, refetch } = useQuery<Shipment[]>({
    queryKey: ['search', query, field],
    queryFn: () => shipmentApi.searchShipments(query, { field, size: 50 }),
  });

  const filteredItems = filterShipmentItems(data, activeTab);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (query) {
      setSearchParams({ q: query });
    } else {
      setSearchParams({});
    }
  };

  return {
    query,
    setQuery,
    field,
    setField,
    activeTab,
    setActiveTab,
    selectedJob,
    setSelectedJob,
    allItems: data,
    filteredItems,
    isLoading,
    error,
    refetch,
    handleSearchSubmit,
  };
}
