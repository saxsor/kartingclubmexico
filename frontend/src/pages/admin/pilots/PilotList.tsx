import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Trash2, Upload, User, Users, X } from 'lucide-react';
import { pilotsApi, Pilot } from '../../../api/pilots.api';
import { toast } from '../../../store/toast.store';
import { PaginationMeta } from '../../../api/pagination';
import { PaginationControls } from '../../../components/shared/PaginationControls';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { EmptyState } from '../../../components/shared/EmptyState';
import { queryKeys } from '../../../lib/react-query';
import { resolveMediaUrl } from '../../../lib/utils';
import { useDebounce } from '../../../hooks/useDebounce';
import { TableLoadingState, InlineLoadingState } from '../../../components/shared/LoadingSkeleton';

interface ImportPreviewRow {
  name: string;
  alias?: string;
  email?: string;
  phone?: string;
  kartNumber?: number;
  action: 'create' | 'update';
}

interface ImportResult {
  created: number;
  updated: number;
  errors: number;
  total: number;
}

function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? match[1] : null;
}

export function PilotList() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [activeFilter, setActiveFilter] = useState<'true' | 'false' | ''>('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  // CSV import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[] | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importConfirming, setImportConfirming] = useState(false);

  const handleImportFile = async (file: File) => {
    pendingFileRef.current = file;
    setImportLoading(true);
    setImportPreview(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const csrf = getCsrfToken();
      const res = await fetch('/api/pilots/import', {
        method: 'POST',
        headers: csrf ? { 'X-CSRF-Token': csrf } : {},
        credentials: 'include',
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Error al procesar CSV');
      setImportPreview(data.preview ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al importar');
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setImportConfirming(true);
    try {
      const fd = new FormData();
      if (!pendingFileRef.current) return;
      fd.append('file', pendingFileRef.current);
      const csrf = getCsrfToken();
      const res = await fetch('/api/pilots/import?confirm=true', {
        method: 'POST',
        headers: csrf ? { 'X-CSRF-Token': csrf } : {},
        credentials: 'include',
        body: fd,
      });
      const data: ImportResult = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as unknown as { error?: string }).error ?? 'Error al confirmar importación');
      toast.success(`Importación completada: ${data.created} creados, ${data.updated} actualizados${data.errors > 0 ? `, ${data.errors} errores` : ''}`);
      setImportPreview(null);
      pendingFileRef.current = null;
      queryClient.invalidateQueries({ queryKey: queryKeys.pilots.all });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al confirmar');
    } finally {
      setImportConfirming(false);
    }
  };

  const listParams = {
    page, pageSize: 10,
    search: debouncedSearch,
    ...(activeFilter !== '' ? { active: activeFilter === 'true' } : {}),
  };
  const pilotsQuery = useQuery({
    queryKey: queryKeys.pilots.list(listParams),
    queryFn: () => pilotsApi.list(listParams),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => pilotsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pilots.all });
    },
  });

  const pilots = pilotsQuery.data?.items ?? [];
  const pagination = pilotsQuery.data?.pagination ?? ({ page: 1, pageSize: 10, total: 0, totalPages: 1 } satisfies PaginationMeta);
  const loading = pilotsQuery.isLoading;

  const [confirmPilot, setConfirmPilot] = useState<Pilot | null>(null);

  const handleDelete = async (pilot: Pilot) => {
    setConfirmPilot(pilot);
  };

  const confirmDelete = async () => {
    if (!confirmPilot) return;
    setDeleting(confirmPilot.id);
    setConfirmPilot(null);
    try {
      await deleteMutation.mutateAsync(confirmPilot.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Pilot <span className="text-[#f5c400]">Roster</span>
          </h1>
          <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] mt-2">
            {pagination.total} piloto{pagination.total !== 1 ? 's' : ''} registrado{pagination.total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white/60 hover:bg-white/10 transition-colors"
            aria-label="Importar pilotos desde CSV"
          >
            <Upload className="h-3.5 w-3.5" /> CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
            }}
          />
          <Link
            to="/app/pilotos/nuevo"
            className="flex items-center gap-2 bg-[#f5c400] hover:bg-[#d99a00] px-4 py-2 text-sm font-bold uppercase tracking-wider text-[#111111] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuevo piloto
          </Link>
        </div>
      </div>

      {/* CSV Import Preview Panel */}
      {(importLoading || importPreview !== null) && (
        <div className="border border-white/10 bg-white/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white text-sm uppercase tracking-wider">
              {importLoading ? 'Procesando CSV...' : `Vista previa — ${importPreview?.length ?? 0} pilotos`}
            </h2>
            {!importLoading && (
              <button
                onClick={() => { setImportPreview(null); pendingFileRef.current = null; }}
                aria-label="Cerrar vista previa"
                className="text-white/30 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {importLoading && (
            <InlineLoadingState lines={3} className="py-6" />
          )}

          {!importLoading && importPreview !== null && (
            <>
              {importPreview.length === 0 ? (
                <p className="text-sm text-white/40">El archivo no contiene filas válidas.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-xs">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-white/40">Nombre</th>
                        <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-white/40 hidden sm:table-cell">Alias</th>
                        <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-white/40 hidden md:table-cell">Email</th>
                        <th className="pb-2 text-center text-[10px] font-bold uppercase tracking-wider text-white/40">Kart</th>
                        <th className="pb-2 text-center text-[10px] font-bold uppercase tracking-wider text-white/40">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((row, i) => (
                        <tr key={i} className="border-b border-white/5 transition-colors hover:bg-white/[0.03]">
                          <td className="py-2 pr-3 text-white font-medium">{row.name}</td>
                          <td className="py-2 pr-3 text-white/50 hidden sm:table-cell">{row.alias ?? '—'}</td>
                          <td className="py-2 pr-3 text-white/50 hidden md:table-cell">{row.email ?? '—'}</td>
                          <td className="py-2 text-center font-mono text-white/50">{row.kartNumber ?? '—'}</td>
                          <td className="py-2 text-center">
                            <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                              row.action === 'create'
                                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            }`}>
                              {row.action === 'create' ? 'Crear' : 'Actualizar'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {importPreview.length > 0 && (
                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmImport}
                    disabled={importConfirming}
                    className="bg-[#f5c400] hover:bg-[#d99a00] disabled:opacity-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#111111] transition-colors"
                  >
                    {importConfirming ? 'Importando...' : `Confirmar importación (${importPreview.length})`}
                  </button>
                  <button
                    onClick={() => { setImportPreview(null); pendingFileRef.current = null; }}
                    className="border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/50 hover:bg-white/10 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nombre, alias o número..."
            className="w-full border border-white/10 bg-[#1f1f27] pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-[#f5c400] focus:outline-none"
          />
        </div>
        <select
          value={activeFilter}
          onChange={(e) => { setActiveFilter(e.target.value as 'true' | 'false' | ''); setPage(1); }}
          className="border border-white/10 bg-[#1f1f27] px-3 py-2.5 text-sm text-white focus:border-[#f5c400] focus:outline-none"
        >
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>

      {loading ? (
        <TableLoadingState rows={6} />
      ) : (
        <div className="border border-[#38383f] overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-[#38383f] bg-[#1f1f27]">
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/40">Piloto</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/40 hidden sm:table-cell">Alias</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Kart</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40 hidden md:table-cell">Estado</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-white/40">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pilots.map((pilot) => (
                <tr key={pilot.id} className="border-b border-[#38383f]/50 hover:bg-[#2a2a35] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {pilot.photoUrl ? (
                        <img src={resolveMediaUrl(pilot.photoUrl) ?? ''} alt={pilot.name} className="h-8 w-8 object-cover flex-shrink-0" />
                      ) : (
                        <div className="h-8 w-8 bg-[#38383f] flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-white/20" />
                        </div>
                      )}
                      <span className="font-bold text-white text-sm">{pilot.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs hidden sm:table-cell">
                    {pilot.alias ? `"${pilot.alias}"` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-white/60 text-xs">
                    {pilot.kartNumber ? `#${pilot.kartNumber}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      pilot.active
                        ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                        : 'bg-white/5 text-white/30 border border-white/10'
                    }`}>
                      {pilot.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        to={`/app/pilotos/${pilot.id}`}
                        className="text-xs font-bold uppercase tracking-wider text-[#f5c400] hover:text-white transition-colors"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => handleDelete(pilot)}
                        disabled={deleting === pilot.id}
                        aria-label={`Eliminar piloto ${pilot.name}`}
                        className="text-white/20 hover:text-red-400 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pilots.length === 0 && !loading && (
            <EmptyState
              icon={Users}
              title={debouncedSearch ? 'Sin resultados' : 'Sin pilotos'}
              description={
                debouncedSearch
                  ? `No se encontró ningún piloto con "${debouncedSearch}".`
                  : 'Agrega el primer piloto para comenzar.'
              }
              action={
                !debouncedSearch
                  ? { label: 'Agregar piloto', href: '/app/pilotos/nuevo' }
                  : undefined
              }
            />
          )}
        </div>
      )}

      <PaginationControls
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        itemLabel="pilotos"
        onPageChange={setPage}
      />

      <ConfirmDialog
        open={!!confirmPilot}
        title="Eliminar piloto"
        description={`¿Seguro que quieres eliminar a "${confirmPilot?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmPilot(null)}
        variant="danger"
      />
    </div>
  );
}
