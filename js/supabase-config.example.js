// Dragon Ball Omega — ligação com o Supabase (MODELO).
// Copie este arquivo para js/supabase-config.js e preencha. O supabase-config.js fica fora do Git (.gitignore).
//
// - url e key vazios: o site roda no modo local de teste (contas e fichas no localStorage do navegador).
// - url e key preenchidos: modo Supabase. Use SÓ a chave pública (anon / publishable), em
//   Project Settings → API. NUNCA a "service_role": ela ignora todas as travas do banco.
// - mestresLocais: e-mails que viram mestre no modo local (no Supabase, o papel vem da tabela perfis).
window.DBO_SUPABASE = {
  url: "",                                  // ex.: "https://abcdxyz.supabase.co"
  key: "",                                  // ex.: "sb_publishable_..." ou a chave anon
  mestresLocais: ["seu-email@exemplo.com"]
};
