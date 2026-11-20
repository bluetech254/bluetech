import React from 'react';
import ServiceCard from './ServiceCard';
import { RepairService } from '../../types';
import { Wrench } from 'lucide-react';

/** Flat mode: just an array of services */
interface FlatProps {
  services: RepairService[];
  grouped?: false;
  isLoading: boolean;
}

/** Grouped mode: a pre-built map of category → services */
interface GroupedProps {
  services?: never;
  grouped: true;
  groupedServices: Record<string, RepairService[]>;
  isLoading: boolean;
}

type ServiceGridProps = FlatProps | GroupedProps;

const SkeletonGrid = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 animate-pulse">
    {Array.from({ length: 12 }).map((_, i) => (
      <div key={i} className="bg-white rounded-xl border border-slate-100 p-3 flex flex-col items-center space-y-2">
        <div className="w-8 h-8 rounded-lg bg-slate-100" />
        <div className="space-y-1 w-full flex flex-col items-center">
          <div className="bg-slate-100 h-3 w-2/3 rounded" />
          <div className="bg-slate-100 h-2 w-1/3 rounded" />
        </div>
        <div className="bg-slate-100 h-4 w-1/4 rounded mt-2" />
        <div className="bg-slate-100 h-6 w-full rounded-md mt-3" />
      </div>
    ))}
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
      <Wrench className="w-8 h-8" />
    </div>
    <h3 className="text-lg font-bold text-slate-900 mb-1">No services found</h3>
    <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
      We couldn't find any certified repair procedures matching your criteria. Contact us or visit our physical shop for a customized repair diagnostic.
    </p>
  </div>
);

const ServiceCardGrid = ({ services }: { services: RepairService[] }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 animate-fade-in">
    {services.map((service) => (
      <ServiceCard key={service.id} service={service} />
    ))}
  </div>
);

export const ServiceGrid = (props: ServiceGridProps) => {
  if (props.isLoading) return <SkeletonGrid />;

  // ─── Grouped mode ────────────────────────────────────────────────────────────
  if (props.grouped) {
    const entries = Object.entries(props.groupedServices);
    if (entries.length === 0) return <EmptyState />;

    return (
      <div className="space-y-10">
        {entries.map(([category, services]) => (
          <section key={category}>
            {/* Category heading */}
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 capitalize">{category}</h3>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-0.5">
                {services.length} service{services.length !== 1 ? 's' : ''}
              </span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
            <ServiceCardGrid services={services} />
          </section>
        ))}
      </div>
    );
  }

  // ─── Flat mode ───────────────────────────────────────────────────────────────
  if (props.services.length === 0) return <EmptyState />;
  return <ServiceCardGrid services={props.services} />;
};

export default ServiceGrid;
