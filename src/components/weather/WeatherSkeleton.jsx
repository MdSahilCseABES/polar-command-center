import React from 'react'

export function WeatherSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Current weather skeleton */}
      <div className="card p-6 shadow-xl">
        <div className="mb-6 flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-4 w-40 bg-[var(--surface-sunken)] rounded" />
            <div className="h-8 w-64 bg-[var(--surface-raised)] rounded" />
            <div className="h-3 w-48 bg-[var(--surface-sunken)] rounded" />
          </div>
          <div className="h-6 w-28 bg-[var(--surface-sunken)] rounded" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 flex items-center gap-6">
            <div className="w-24 h-24 rounded-xl bg-[var(--surface-sunken)] border border-[var(--line)]" />
            <div className="space-y-3">
              <div className="h-14 w-44 bg-[var(--surface-raised)] rounded" />
              <div className="h-4 w-32 bg-[var(--surface-sunken)] rounded" />
            </div>
          </div>
          <div className="lg:col-span-5 h-28 bg-[var(--surface-sunken)] rounded-lg border border-[var(--line)]" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-[var(--line)]">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 bg-[var(--surface-sunken)] rounded border border-[var(--line)]" />
          ))}
        </div>
      </div>

      {/* Hourly skeleton */}
      <div className="card p-5 shadow-lg">
        <div className="h-4 w-52 bg-[var(--surface-sunken)] rounded mb-4" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="w-28 h-36 bg-[var(--surface-sunken)] rounded-lg shrink-0 border border-[var(--line)]" />
          ))}
        </div>
      </div>

      {/* 15-day forecast skeleton */}
      <div className="card p-6 shadow-xl">
        <div className="h-5 w-60 bg-[var(--surface-sunken)] rounded mb-4" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="w-48 h-56 bg-[var(--surface-sunken)] rounded-lg shrink-0 border border-[var(--line)]" />
          ))}
        </div>
      </div>
    </div>
  )
}
