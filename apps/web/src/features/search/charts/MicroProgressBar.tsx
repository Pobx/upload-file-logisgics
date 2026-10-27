import React from 'react';

export interface MicroProgressBarProps {
  hasInvoice: boolean;
  hasPackingList?: boolean;
  hasBL: boolean;
  isBLPending?: boolean;
  className?: string;
}

export const MicroProgressBar: React.FC<MicroProgressBarProps> = ({
  hasInvoice,
  hasPackingList = true,
  hasBL,
  isBLPending = false,
  className = '',
}) => {
  const getBLClass = () => {
    if (!hasBL) return 'bg-rose-500';
    if (isBLPending) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className={`flex gap-1 h-1.5 w-full rounded-sm overflow-hidden ${className}`} role="progressbar">
      <div 
        className={`flex-1 rounded-xs transition-colors ${hasInvoice ? 'bg-emerald-500' : 'bg-rose-500'}`} 
        title={hasInvoice ? 'Invoice: เรียบร้อย' : 'Invoice: ยังไม่ได้รับ'} 
      />
      <div 
        className={`flex-1 rounded-xs transition-colors ${hasPackingList ? 'bg-emerald-500' : 'bg-amber-500'}`} 
        title={hasPackingList ? 'Packing List: เรียบร้อย' : 'Packing List: รอตรวจสอบ'} 
      />
      <div 
        className={`flex-1 rounded-xs transition-colors ${getBLClass()}`} 
        title={!hasBL ? 'B/L: ยังไม่ได้รับ' : isBLPending ? 'B/L: รอตรวจพิกัด' : 'B/L: เรียบร้อย'} 
      />
    </div>
  );
};
