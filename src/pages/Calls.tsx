import React from 'react';
import { CallRecords } from '../components/CallRecords';

export function Calls() {
  return (
    <div className="animate-in fade-in duration-700">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase tracking-widest">
          My Calls
        </h1>
        <p className="text-slate-500 font-medium mt-1">
          Review your performance and interaction details
        </p>
      </div>

      <div className="bg-white/40 backdrop-blur-xl rounded-[40px] border border-white/60 p-8 shadow-2xl shadow-slate-200/40">
        <CallRecords />
      </div>
    </div>
  );
}
