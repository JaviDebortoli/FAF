import { ASSET_ALLOWLIST } from '@/src/market/assets';

interface AssetFilterProps {
  selected: string | 'ALL';
  onChange: (value: string | 'ALL') => void;
}

/** Multi-asset filter (design.md decision-dashboard spec: "all configured assets visible/filterable in one view"). */
export function AssetFilter({ selected, onChange }: AssetFilterProps) {
  return (
    <label>
      Asset:{' '}
      <select value={selected} onChange={(e) => onChange(e.target.value)} aria-label="Asset filter">
        <option value="ALL">All assets</option>
        {ASSET_ALLOWLIST.map((asset) => (
          <option key={asset} value={asset}>
            {asset}
          </option>
        ))}
      </select>
    </label>
  );
}
