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
  /** True enquanto o usuário chegou por um link de recuperação e ainda não redefiniu a senha. */
  recuperandoSenha: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  /** Retorna true quando a conta foi criada mas ainda precisa de confirmação por e-mail. */
  cadastrar: (nome: string, email: string, senha: string) => Promise<boolean>;
  sair: () => Promise<void>;
  atualizarPerfil: (dados: { nome?: string; pix_key?: string | null }) => Promise<void>;
  /** Recarrega o perfil do banco (ex.: após arquivar/desarquivar a conta). */
  recarregarPerfil: () => Promise<void>;
  /** Troca a senha da conta autenticada (também conclui a recuperação). */
  trocarSenha: (novaSenha: string) => Promise<void>;
  /** Pede a troca de e-mail; o Auth envia links de confirmação antes de efetivar. */
  trocarEmail: (novoEmail: string) => Promise<void>;
  /** Envia o e-mail de "esqueci minha senha" (não exige estar logado). */
  recuperarSenha: (email: string) => Promise<void>;
}

const AuthContext = createContext<EstadoAutenticacao | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Profile | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [recuperandoSenha, setRecuperandoSenha] = useState(false);

  const carregarPerfil = useCallback(async (usuarioId: string) => {
    // categorias(*) em vez de colunas explícitas: o perfil continua carregando
    // mesmo se o frontend conhecer colunas que o backend ainda não tem.
    const { data, error } = await supabase
      .from('profiles')
      .select('*, categorias(*)')
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

    const { data: inscricao } = supabase.auth.onAuthStateChange((evento, novaSessao) => {
      // Link de "esqueci minha senha": a sessão nasce em modo de recuperação
      // e o App mostra a tela de redefinição até a senha ser trocada.
      if (evento === 'PASSWORD_RECOVERY') setRecuperandoSenha(true);
      setSessao(novaSessao);
      if (novaSessao) {
        void carregarPerfil(novaSessao.user.id);
      } else {
        setPerfil(null);
        setRecuperandoSenha(false);
      }
    });
    return () => inscricao.subscription.unsubscribe();
  }, [carregarPerfil]);

  const entrar = useCallback(async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw new Error(traduzirErroAuth(error.message));
  }, []);

  const cadastrar = useCallback(async (nome: string, email: string, senha: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome },
        // O link de confirmação deve voltar para o domínio em uso
        // (o Site URL do projeto também precisa apontar para produção).
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw new Error(traduzirErroAuth(error.message));
    // Sem sessão na resposta = confirmação de e-mail pendente.
    return data.session === null;
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

  const recarregarPerfil = useCallback(async () => {
    if (sessao) await carregarPerfil(sessao.user.id);
  }, [sessao, carregarPerfil]);

  const trocarSenha = useCallback(async (novaSenha: string) => {
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) throw new Error(traduzirErroAuth(error.message));
    setRecuperandoSenha(false);
  }, []);

  const trocarEmail = useCallback(async (novoEmail: string) => {
    // O Auth envia links de confirmação (para o e-mail novo e o atual) e só
    // efetiva a troca depois; o backend espelha em profiles.email por gatilho.
    const { error } = await supabase.auth.updateUser(
      { email: novoEmail },
      { emailRedirectTo: window.location.origin },
    );
    if (error) throw new Error(traduzirErroAuth(error.message));
  }, []);

  const recuperarSenha = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw new Error(traduzirErroAuth(error.message));
  }, []);

  const valor = useMemo(
    () => ({
      sessao,
      perfil,
      carregando,
      recuperandoSenha,
      entrar,
      cadastrar,
      sair,
      atualizarPerfil,
      recarregarPerfil,
      trocarSenha,
      trocarEmail,
      recuperarSenha,
    }),
    [
      sessao,
      perfil,
      carregando,
      recuperandoSenha,
      entrar,
      cadastrar,
      sair,
      atualizarPerfil,
      recarregarPerfil,
      trocarSenha,
      trocarEmail,
      recuperarSenha,
    ],
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
  if (mensagem.includes('Email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar. Procure a mensagem na caixa de entrada (ou no spam).';
  }
  if (mensagem.includes('already registered')) return 'Este e-mail já está cadastrado.';
  if (mensagem.includes('at least 6 characters')) return 'A senha deve ter ao menos 6 caracteres.';
  if (mensagem.includes('different from the old password')) {
    return 'A nova senha precisa ser diferente da senha atual.';
  }
  if (mensagem.includes('rate limit') || mensagem.includes('security purposes')) {
    return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.';
  }
  return mensagem;
}
