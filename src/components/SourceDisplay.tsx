import React from 'react';
import { Globe, Plus } from 'lucide-react';
import { getSourceDisplayNameSync, isSourceConfigured } from '../utils/sourceMapping';

interface SourceDisplayProps {
  fonte: string | number | null;
  onConfigureClick: () => void;
}

const SourceDisplay: React.FC<SourceDisplayProps> = ({ fonte, onConfigureClick }) => {
  const isConfigured = isSourceConfigured(fonte);
  const displayName = getSourceDisplayNameSync(fonte);

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-gray-400" />
      {!isConfigured ? (
        <>
          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
            {fonte}
          </span>
          <button
            onClick={onConfigureClick}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Cadastrar
          </button>
        </>
      ) : (
        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
          {displayName}
        </span>
      )}
    </div>
  );
};

export default SourceDisplay;
