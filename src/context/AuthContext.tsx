// Autenticação via Supabase Auth (RF-AUTH-01) com o perfil do usuário.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

interface EstadoAutenticacao {
  sessao: Session | null;
  perfil: Profile | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  cadastrar: (nome: string, email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  atualizarPerfil: (dados: { nome?: string; pix_key?: string | null }) => Promise<void>;
}

const AuthContext = createContext<EstadoAutenticacao | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Profile | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregarPerfil = useCallback(async (usuarioId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', usuarioId)
      .single();
    if (!error) setPerfil(data as Profile);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      if (data.session) void carregarPerfil(data.session.user.id);
      setCarregando(false);
    });

    const { data: inscricao } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao);
      if (novaSessao) {
        void carregarPerfil(novaSessao.user.id);
      } else {
        setPerfil(null);
      }
    });
    return () => inscricao.subscription.unsubscribe();
  }, [carregarPerfil]);

  const entrar = useCallback(async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw new Error(traduzirErroAuth(error.message));
  }, []);

  const cadastrar = useCallback(async (nome: string, email: string, senha: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    });
    if (error) throw new Error(traduzirErroAuth(error.message));
  }, []);

  const sair = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const atualizarPerfil = useCallback(
    async (dados: { nome?: string; pix_key?: string | null }) => {
      if (!sessao) throw new Error('Sessão expirada.');
      const { error } = await supabase.from('profiles').update(dados).eq('id', sessao.user.id);
      if (error) {
        if (error.code === '23505') {
          throw new Error('Esta chave PIX já está cadastrada por outro usuário.');
        }
        throw new Error(error.message);
      }
      await carregarPerfil(sessao.user.id);
    },
    [sessao, carregarPerfil],
  );

  const valor = useMemo(
    () => ({ sessao, perfil, carregando, entrar, cadastrar, sair, atualizarPerfil }),
    [sessao, perfil, carregando, entrar, cadastrar, sair, atualizarPerfil],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): EstadoAutenticacao {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return contexto;
}

function traduzirErroAuth(mensagem: string): string {
  if (mensagem.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (mensagem.includes('already registered')) return 'Este e-mail já está cadastrado.';
  if (mensagem.includes('at least 6 characters')) return 'A senha deve ter ao menos 6 caracteres.';
  return mensagem;
}
