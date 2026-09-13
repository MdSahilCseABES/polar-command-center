/**
 * DATATABLE — one table component used by every list page.
 *
 * Instead of writing <table><thead>… by hand on six pages, each page
 * describes its COLUMNS as data and hands over the rows:
 *
 *   <DataTable
 *     columns={[
 *       { header: 'ID',     cell: (r) => r.id, mono: true, width: '84px' },
 *       { header: 'Name',   cell: (r) => r.name, strong: true },
 *       { header: 'Status', cell: (r) => <Badge map={CARGO_STATUS} value={r.status} /> },
 *     ]}
 *     rows={cargo}
 *     rowKey={(r) => r.id}
 *   />
 *
 * It also handles the loading / error / empty states for you (master
 * prompt section 15), so a page can never render a broken empty table.
 */

import StateBlock from './StateBlock'

export default function DataTable({
  columns,
  rows,
  rowKey,
  loading = false,
  error = null,
  emptyTitle,
  emptyMessage,
  onRowClick,
  maxHeight,
}) {
  /* --- the three "no table" states, in priority order --- */
  if (loading) return <StateBlock kind="loading" />
  if (error) return <StateBlock kind="error" message={String(error)} />
  if (!rows || rows.length === 0)
    return <StateBlock kind="empty" title={emptyTitle} message={emptyMessage} />

  /* --- the real table --- */
  return (
    <div className="table-scroll" style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                style={{ width: col.width, textAlign: col.align || 'left' }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowKey ? rowKey(row) : rowIndex}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={onRowClick ? { cursor: 'pointer' } : undefined}
            >
              {columns.map((col, colIndex) => {
                const classes = [
                  col.strong ? 'cell-strong' : '',
                  col.mono ? 'mono' : '',
                  col.className || '',
                ]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <td
                    key={colIndex}
                    className={classes || undefined}
                    style={{ textAlign: col.align || 'left' }}
                  >
                    {col.cell ? col.cell(row, rowIndex) : row[col.key]}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
