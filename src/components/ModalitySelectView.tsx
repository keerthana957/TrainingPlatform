import React from 'react';
import { Modality } from '../types/radiology';
import { SCAN_IMAGES } from '../data/mockClinicalData';

interface ModalitySelectViewProps {
  onChooseModality: (modality: Modality) => void;
}

const MODALITY_CARDS: {
  id: Modality;
  displayLabel: string;
  image: string;
}[] = [
  {
    id: 'X-ray',
    displayLabel: 'XRAY',
    image: SCAN_IMAGES.chestXray,
  },
  {
    id: 'CT',
    displayLabel: 'CT',
    image: SCAN_IMAGES.headCt,
  },
  {
    id: 'US',
    displayLabel: 'US',
    image: SCAN_IMAGES.biliaryUs,
  },
];

export const ModalitySelectView: React.FC<ModalitySelectViewProps> = ({
  onChooseModality,
}) => {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-black text-white flex flex-col items-center justify-center px-6 py-16">
      <div className="text-center max-w-xl">
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
          Select Modality
        </h1>
        <p className="text-sm sm:text-base text-slate-400 mt-3">
          Choose an imaging modality below to open training programs
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full">
        {MODALITY_CARDS.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => onChooseModality(card.id)}
            className="group bg-[#0B111E] hover:bg-[#10182B] border border-slate-800 hover:border-sky-500/70 rounded-2xl p-8 flex flex-col items-center justify-center gap-6 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <div className="w-28 h-28 rounded-2xl overflow-hidden border border-slate-700/80 bg-black flex items-center justify-center">
              <img
                src={card.image}
                alt={`${card.displayLabel} diagnostic modality`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-95 group-hover:scale-105 transition-transform duration-150"
              />
            </div>
            <span className="font-display text-xl font-bold tracking-wide text-white">
              {card.displayLabel}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
