

import React from 'react';
import { Building, Day, Timetable } from '../types';
import { ClockIcon } from './icons/ClockIcon';

interface ViewTimetableModalProps {
  building: Building;
  onClose: () => void;
}

const ViewTimetableModal: React.FC<ViewTimetableModalProps> = ({ building, onClose }) => {
  const days: Day[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const hours = Array.from({ length: 14 }, (_, i) => `${(8 + i).toString().padStart(2, '0')}:00`);
  const timetable: Timetable = building.timetable;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center animate-fadeIn p-4" onClick={onClose}>
      <div className="bg-white dark:bg-brand-surface rounded-lg shadow-2xl w-full max-w-5xl animate-fadeInUp flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-brand-text-primary">Timetable: {building.name}</h2>
          <p className="text-sm text-slate-500 dark:text-brand-text-secondary">Weekly schedule from 8:00 AM to 10:00 PM</p>
        </div>
        <div className="overflow-auto px-6 pb-6">
          <table className="w-full text-sm text-center border-separate" style={{ borderSpacing: '0.25rem' }}>
              <thead className="sticky top-0 z-10">
                  <tr>
                      <th className="p-2 font-semibold text-slate-600 dark:text-brand-text-secondary w-24 text-left bg-white dark:bg-brand-surface">
                        <div className="flex items-center">
                          <ClockIcon className="w-4 h-4 mr-2" /> Time
                        </div>
                      </th>
                      {days.map(day => <th key={day} className="p-2 font-semibold text-slate-600 dark:text-brand-text-secondary capitalize bg-white dark:bg-brand-surface">{day}</th>)}
                  </tr>
              </thead>
              <tbody>
                  {hours.map((hour, hourIndex) => (
                      <tr key={hour}>
                          <td className="p-2 font-mono text-sm text-slate-500 dark:text-brand-text-secondary text-left whitespace-nowrap">{hour}</td>
                          {days.map(day => {
                              const slotContent = timetable[day][hourIndex];
                              const isBusy = slotContent && slotContent.toLowerCase() !== 'available';
                              return (
                              <td key={day} className="p-1 text-center">
                                  {isBusy ? (
                                      <div className="text-sm font-semibold px-2 py-3 rounded-md bg-brand-primary text-white shadow-[0_4px_14px_rgba(139,92,246,0.25)]">
                                          {slotContent}
                                      </div>
                                  ) : (
                                      <span className="text-slate-400 dark:text-slate-500 text-sm">
                                          Available
                                      </span>
                                  )}
                              </td>
                          )})}
                      </tr>
                  ))}
              </tbody>
          </table>
        </div>
        <div className="flex justify-end p-6">
            <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-medium text-white bg-brand-primary hover:bg-brand-secondary rounded-md transition-colors shadow-lg hover:shadow-brand-primary/40">Close</button>
        </div>
      </div>
    </div>
  );
};

export default ViewTimetableModal;