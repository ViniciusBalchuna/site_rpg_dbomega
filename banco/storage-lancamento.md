# Passar as imagens para o Storage (fazer só no lançamento)

Esta pasta (`banco`) não vai no deploy do site. Este é o passo a passo para quando você disser "vou lançar o site oficialmente!".

## Como está hoje
- O recorte (`DBOCropper`, `account-ui.js`, `DBOEnc.imagesField`) gera a imagem **em WebP** (JPEG só se o navegador não souber) e guarda como **texto base64** nas colunas:
  `personagens.foto_url`, `perfis.foto_url`, `criaturas.imagem_url`, `cartazes.imagem_url`, `planetas.imagem_url` e `planetas.imagens` (lista de textos).
- O bucket público `fotos` e as regras (cada pessoa só mexe em `fotos/<id-da-pessoa>/...`) **já existem** no `schema.sql` (seção 12). Não precisa de SQL novo, nem de mudar colunas: elas já são `text`.

## Por que vale a pena
- A coluna passa a guardar só uma URL curta (cerca de 80 caracteres), e as listas (Personagens, Campanha, Missões) param de carregar megabytes de imagem junto com os dados.
- O navegador e o CDN guardam cada imagem em cache; o `loading="lazy"` funciona de verdade.
- O cache de pré-carga (`localStorage`, uns 5 MB) fica leve e deixa de estourar com muitas fichas.

## Passos
1. **Função única de envio** (um arquivo novo, ex.: `js/imagens.js`, usado por todos os módulos):
   `DBOImg.enviar(dataUrlOuBlob, pasta) -> Promise<url>`
   - converte o data URL em Blob;
   - envia para `fotos/<id-do-usuário>/<pasta>/<uuid>.webp` (`pasta` = `personagem`, `perfil`, `criatura`, `cartaz`, `planeta`);
   - `upsert: false`, `cacheControl: 31536000` (o nome é único, então pode cachear por um ano);
   - devolve a URL pública (`/storage/v1/object/public/fotos/...`).
   - No modo local (sem Supabase) continua devolvendo o data URL, como hoje.
2. **Trocar os 4 pontos de gravação** para chamar `DBOImg.enviar` antes do `insert`/`update` e gravar a URL:
   `characters.js` (foto do personagem), `account-ui.js` (foto do perfil), `enciclopedia-data.js` (criaturas, cartazes e planetas, incluindo `imagens` e `imagem_url`).
3. **Apagar o arquivo antigo** quando a imagem for trocada ou o item for removido (personagem, cartaz, criatura, planeta, pasta de planetas em cascata). Guarde o caminho a partir da URL e chame `storage.remove([...])`. Sem isso o bucket enche de arquivos órfãos.
4. **Limite de tamanho** no bucket (ex.: 1 MB por arquivo) e só `image/webp`, `image/jpeg` no tipo permitido (Dashboard > Storage > fotos > Edit bucket).
5. **Migrar o que já existe em base64** (rodar uma vez, como mestre, num script temporário no navegador):
   para cada linha com valor começando em `data:image`, converter em Blob, enviar, e gravar a URL de volta. Faça primeiro uma cópia (Table Editor > Export CSV) das cinco tabelas.
6. **Pré-carga**: `hydrate()`/`saveCache()` já guardam o que vier do banco, então passam a guardar URLs sem mudar nada.
7. **Cache de imagens no deploy**: confira que o `_headers` não bloqueia as URLs do Supabase (elas vêm de outro domínio, então não passam pelo seu `_headers`).

## Testes antes de publicar
- Criar personagem com foto, trocar a foto, remover o personagem (arquivo some do bucket).
- Mesma coisa para cartaz, criatura e planeta com várias imagens (carrossel).
- Entrar com outra conta e conferir que ela **não** consegue apagar nem sobrescrever a pasta de outra pessoa.
- Modo sem conta (local): continua funcionando com data URL.

## Se algo der errado
Os data URLs antigos continuam funcionando, porque o `<img>` aceita os dois tipos. Dá para migrar aos poucos, sem apagar a cópia em base64 até ter certeza.
