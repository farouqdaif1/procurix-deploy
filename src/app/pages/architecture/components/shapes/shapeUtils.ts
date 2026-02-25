import { 
  Cpu, Zap, Battery, Thermometer, Shield, Radio 
} from 'lucide-react';

export const getComponentIcon = (type: string) => {
  if (type.includes('regulator') || type.includes('ldo')) return Zap;
  if (type.includes('battery') || type.includes('charger')) return Battery;
  if (type.includes('thermal') || type.includes('temp')) return Thermometer;
  if (type.includes('protection') || type.includes('safety')) return Shield;
  if (type.includes('communication') || type.includes('radio')) return Radio;
  return Cpu;
};

export const getTypeColor = (type: string) => {
  if (type.includes('regulator') || type.includes('ldo')) return 'from-purple-500 to-purple-600';
  if (type.includes('battery') || type.includes('charger')) return 'from-green-500 to-green-600';
  if (type.includes('converter')) return 'from-amber-500 to-amber-600';
  if (type.includes('protection')) return 'from-red-500 to-red-600';
  if (type.includes('communication')) return 'from-blue-500 to-blue-600';
  return 'from-gray-500 to-gray-600';
};

export const getTypeBorderColor = (type: string, selected: boolean) => {
  if (selected) return '#3b82f6'; // blue-500
  
  if (type.includes('regulator') || type.includes('ldo')) return '#a855f7'; // purple-500
  if (type.includes('battery') || type.includes('charger')) return '#22c55e'; // green-500
  if (type.includes('converter')) return '#f59e0b'; // amber-500
  if (type.includes('protection')) return '#ef4444'; // red-500
  if (type.includes('communication')) return '#3b82f6'; // blue-500
  return '#e5e7eb'; // gray-200
};
