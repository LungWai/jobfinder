import React from 'react';
import { JobFilters, FilterOptions } from '../types/job';

interface SearchFiltersProps {
  filters: JobFilters;
  onFiltersChange: (filters: JobFilters) => void;
  filterOptions?: FilterOptions;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onFiltersChange,
  filterOptions
}) => {
  const handleFilterChange = (key: keyof JobFilters, value: any) => {
    const newFilters = { ...filters };
    if (value === '' || value === undefined) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            className="select-field"
            value={filters.category || ''}
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            <option value="">All Categories</option>
            {filterOptions?.categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Location Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <select
            className="select-field"
            value={filters.location || ''}
            onChange={(e) => handleFilterChange('location', e.target.value)}
          >
            <option value="">All Locations</option>
            {filterOptions?.locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>

        {/* Portal Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Job Portal
          </label>
          <select
            className="select-field"
            value={filters.portal || ''}
            onChange={(e) => handleFilterChange('portal', e.target.value)}
          >
            <option value="">All Portals</option>
            {filterOptions?.portals.map((portal) => (
              <option key={portal} value={portal}>
                {portal}
              </option>
            ))}
          </select>
        </div>

        {/* Date Posted Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date Posted
          </label>
          <select
            className="select-field"
            value={filters.datePosted || ''}
            onChange={(e) => handleFilterChange('datePosted', e.target.value as any)}
          >
            <option value="">Any Time</option>
            <option value="today">Today</option>
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Employment Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Employment Type
          </label>
          <select
            className="select-field"
            value={filters.employmentType || ''}
            onChange={(e) => handleFilterChange('employmentType', e.target.value)}
          >
            <option value="">All Types</option>
            {filterOptions?.employmentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Experience Level Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Experience Level
          </label>
          <select
            className="select-field"
            value={filters.experienceLevel || ''}
            onChange={(e) => handleFilterChange('experienceLevel', e.target.value)}
          >
            <option value="">All Levels</option>
            {filterOptions?.experienceLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        <div className="flex items-end">
          <button
            onClick={clearAllFilters}
            className="w-full btn-secondary"
            disabled={Object.keys(filters).length <= 1}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Salary Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Minimum Salary (HKD)
          </label>
          <input
            type="number"
            className="input-field"
            placeholder="e.g. 20000"
            value={filters.salaryMin || ''}
            onChange={(e) => handleFilterChange('salaryMin', e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Maximum Salary (HKD)
          </label>
          <input
            type="number"
            className="input-field"
            placeholder="e.g. 50000"
            value={filters.salaryMax || ''}
            onChange={(e) => handleFilterChange('salaryMax', e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </div>
      </div>

      {/* Active Filters Summary */}
      {Object.keys(filters).length > 1 && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700">Active filters:</span>
            {Object.entries(filters).map(([key, value]) => {
              if (key === 'search' || !value) return null;
              return (
                <span
                  key={key}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                >
                  {key}: {value}
                  <button
                    onClick={() => handleFilterChange(key as keyof JobFilters, undefined)}
                    className="ml-1 text-primary-600 hover:text-primary-800"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchFilters;
