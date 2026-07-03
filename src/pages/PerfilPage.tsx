import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';

export function PerfilPage() {
  const { perfil, atualizarPerfil } = useAuth();
  const [nome, setNome] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [mensagem, setMensagem] = useState<{ tipo: 'erro' | 'sucesso'; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (perfil) {
      setNome(perfil.nome);
      setChavePix(perfil.pix_key ?? '');
    }
  }, [perfil]);

  async function aoSalvar(evento: FormEvent) {
    evento.preventDefault();
    setMensagem(null);
    setSalvando(true);
    try {
      await atualizarPerfil({ nome: nome.trim(), pix_key: chavePix.trim() || null });
      setMensagem({ tipo: 'sucesso', texto: 'Perfil atualizado com sucesso.' });
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: erro instanceof Error ? erro.message : String(erro) });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>Meu perfil</h1>
          <p className="subtitulo">{perfil?.email}</p>
        </div>
      </div>

      <div className="cartao" style={{ maxWidth: 480 }}>
        <form className="formulario" onSubmit={(e) => void aoSalvar(e)}>
          <div className="campo">
            <label htmlFor="nome">Nome</label>
            <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div className="campo">
            <label htmlFor="pix">Chave PIX</label>
            <input
              id="pix"
              value={chavePix}
              onChange={(e) => setChavePix(e.target.value)}
              placeholder="CPF, e-mail, telefone ou chave aleatória"
            />
            <p className="subtitulo" style={{ fontSize: '0.82rem' }}>
              Os pagamentos das suas vendas são recebidos nesta chave. Ela aparece no cardápio
              digital junto aos seus itens.
            </p>
          </div>

          {mensagem && (
            <p className={mensagem.tipo === 'erro' ? 'mensagem-erro' : 'mensagem-sucesso'}>
              {mensagem.texto}
            </p>
          )}

          <button type="submit" className="botao" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </form>
      </div>
    </>
  );
}
