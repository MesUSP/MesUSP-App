import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { arquivarConta, desarquivarConta, removerConta } from '../lib/api';

export function PerfilPage() {
  const { perfil, atualizarPerfil, recarregarPerfil, sair } = useAuth();
  const [nome, setNome] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [mensagem, setMensagem] = useState<{ tipo: 'erro' | 'sucesso'; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagemConta, setMensagemConta] = useState<string | null>(null);

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

      <div className="cartao" style={{ maxWidth: 480, marginTop: '1rem' }}>
        <h2>Conta</h2>
        <p className="subtitulo">
          Cada conta pode ter até 2 mesinhas e 20 itens. Arquivar a conta esconde suas mesinhas e
          itens do aplicativo, mas você continua vendo tudo e pode desarquivar. Remover a conta
          esconde tudo inclusive de você — sem volta.
        </p>
        {mensagemConta && <p className="mensagem-erro">{mensagemConta}</p>}
        <div className="linha-flex">
          {perfil?.status === 'arquivada' ? (
            <button
              type="button"
              className="botao botao-secundario"
              onClick={() => {
                setMensagemConta(null);
                desarquivarConta()
                  .then(recarregarPerfil)
                  .catch((erro: unknown) =>
                    setMensagemConta(erro instanceof Error ? erro.message : String(erro)),
                  );
              }}
            >
              Desarquivar conta
            </button>
          ) : (
            <button
              type="button"
              className="botao botao-fantasma"
              onClick={() => {
                if (
                  !window.confirm(
                    'Arquivar sua conta? Suas mesinhas, itens e listagens sairão do aplicativo e do cardápio público, mas você continuará vendo tudo e poderá desarquivar. Ao desarquivar, mesinhas e itens são reativados um a um.',
                  )
                ) {
                  return;
                }
                setMensagemConta(null);
                arquivarConta()
                  .then(recarregarPerfil)
                  .catch((erro: unknown) =>
                    setMensagemConta(erro instanceof Error ? erro.message : String(erro)),
                  );
              }}
            >
              Arquivar conta
            </button>
          )}
          <button
            type="button"
            className="botao botao-perigo"
            onClick={() => {
              const confirmado =
                window.confirm(
                  'Remover sua conta? Suas mesinhas, itens, listagens e histórico desaparecerão do aplicativo para todos — inclusive para você — e NÃO poderão ser recuperados.',
                ) && window.confirm('Tem certeza? Esta ação não pode ser desfeita.');
              if (!confirmado) return;
              setMensagemConta(null);
              removerConta()
                .then(() => sair())
                .catch((erro: unknown) =>
                  setMensagemConta(erro instanceof Error ? erro.message : String(erro)),
                );
            }}
          >
            Remover conta
          </button>
        </div>
      </div>
    </>
  );
}
