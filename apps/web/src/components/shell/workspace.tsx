'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, getUser } from '@/lib/api';

export interface ProjectOption {
  id: string;
  name: string;
  code?: string;
  status?: string;
}

interface WorkspaceState {
  projects: ProjectOption[];
  projectId: string | null;
  setProjectId: (id: string | null) => void;
  currentProject: ProjectOption | null;
  orgName: string;
  isAdmin: boolean;
}

const WorkspaceContext = createContext<WorkspaceState | null>(null);
const KEY = 're_project_id';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const user = useMemo(() => getUser(), []);
  const isAdmin = Boolean(user?.permissions?.includes('*'));

  const [projectId, setProjectIdState] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') setProjectIdState(window.localStorage.getItem(KEY));
  }, []);

  const { data } = useQuery({
    queryKey: ['workspace', 'projects'],
    queryFn: () => api<any>('/projects?limit=100'),
    staleTime: 5 * 60_000,
  });

  const projects: ProjectOption[] = useMemo(() => {
    const items = Array.isArray(data) ? data : data?.items ?? [];
    return items.map((p: any) => ({ id: p.id, name: p.name, code: p.code, status: p.status }));
  }, [data]);

  const setProjectId = (id: string | null) => {
    setProjectIdState(id);
    if (typeof window !== 'undefined') {
      if (id) window.localStorage.setItem(KEY, id);
      else window.localStorage.removeItem(KEY);
    }
  };

  const currentProject = projects.find((p) => p.id === projectId) ?? null;

  const value: WorkspaceState = {
    projects,
    projectId,
    setProjectId,
    currentProject,
    orgName: user?.organization?.name ?? 'Workspace',
    isAdmin,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
