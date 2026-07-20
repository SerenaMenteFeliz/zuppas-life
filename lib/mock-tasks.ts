import { Task } from "./types";

// Dado real extraído do Vault Zuppas (memoria-negocio.md + Painel - Hoje.md, 13/07/2026)
// e do Vault Appyon (20 - Tasks/0. Index.md, 13/07/2026). Serve de base pra migração
// quando o schema real for pro Supabase — não é placeholder.

const zuppas: Task[] = [
  // Lar Interior — Landing / captura
  { id: "z1", workspace: "zuppas", projeto: "Lar Interior", titulo: "DNS Registro.br: A larinterior 76.76.21.21 → domínio ativo", status: "aberta", responsavel: "Yan", nota: "Único bloqueio restante da landing", atualizado: "2026-06-26" },
  { id: "z2", workspace: "zuppas", projeto: "Lar Interior", titulo: "Liz revisar copy da landing page", status: "aberta", responsavel: "Liz", atualizado: "2026-07-04" },
  { id: "z3", workspace: "zuppas", projeto: "Lar Interior", titulo: "Editar fotos tiradas em Ubatuba (28/06) + subir na landing", status: "aberta", responsavel: "Liz", atualizado: "2026-06-28" },
  { id: "z4", workspace: "zuppas", projeto: "Lar Interior", titulo: "Automação de boas-vindas no Brevo + automação de hard bounce", status: "aberta", responsavel: "Yan", atualizado: "2026-06-23" },
  { id: "z5", workspace: "zuppas", projeto: "Lar Interior", titulo: "Instrumentar PostHog na landing (page_view + lead_submitted, máscara de input)", status: "aberta", responsavel: "Yan", atualizado: "2026-06-23" },
  { id: "z6", workspace: "zuppas", projeto: "Lar Interior", titulo: "Definir sequência de aquecimento no Brevo", status: "aberta", responsavel: "Yan", atualizado: "2026-06-23" },

  // Lar Interior — Conteúdo / lançamento
  { id: "z7", workspace: "zuppas", projeto: "Lar Interior", titulo: "Liz revisar e aprovar os 5 roteiros de Reels", status: "aberta", responsavel: "Liz", atualizado: "2026-07-04" },
  { id: "z8", workspace: "zuppas", projeto: "Lar Interior", titulo: "Gravar as 7 aulas do Desafio (cenários de natureza, Ubatuba)", status: "aberta", responsavel: "Liz", atualizado: "2026-06-20" },
  { id: "z9", workspace: "zuppas", projeto: "Lar Interior", titulo: "Gravar bônus: Meditação p/ Dormir, Rastreador PDF, Carta Dia 14, SOS Ansiedade", status: "aberta", responsavel: "Liz", atualizado: "2026-06-20" },
  { id: "z10", workspace: "zuppas", projeto: "Lar Interior", titulo: "Grupo de WhatsApp pra leads (aquecimento pré-venda) — número ainda não ativo", status: "aberta", responsavel: "Yan", atualizado: "2026-06-20" },
  { id: "z11", workspace: "zuppas", projeto: "Lar Interior", titulo: "Escrever texto da Carta do Dia 14 (mecanismo já pronto em lib/lar-carta.ts)", status: "aberta", responsavel: "Liz", atualizado: "2026-07-12" },

  // App Serena Mente Feliz
  { id: "z12", workspace: "zuppas", projeto: "App Serena Mente Feliz", titulo: "Aplicar migration 0006_book_notes.sql (destrava Notas do Cálice + diário do Lar)", status: "aberta", responsavel: "Yan", nota: "Precisa da senha do banco Supabase", atualizado: "2026-07-12" },
  { id: "z13", workspace: "zuppas", projeto: "App Serena Mente Feliz", titulo: "Criar projeto no PostHog + colar NEXT_PUBLIC_POSTHOG_KEY (local e Vercel)", status: "aberta", responsavel: "Yan", nota: "Código já instrumentado, roda como no-op sem a chave", atualizado: "2026-07-12" },
  { id: "z14", workspace: "zuppas", projeto: "App Serena Mente Feliz", titulo: "Confirmar processo de publicação/deploy do serena-app", status: "aberta", responsavel: "Yan", nota: "Sem .vercel nem remote git configurado no repo local", atualizado: "2026-07-12" },
  { id: "z15", workspace: "zuppas", projeto: "App Serena Mente Feliz", titulo: "Integrar Asaas (webhook de pagamento)", status: "aberta", responsavel: "Yan", nota: "Único bloqueio real de lançamento — mexe com dinheiro real", atualizado: "2026-07-12" },
  { id: "z16", workspace: "zuppas", projeto: "App Serena Mente Feliz", titulo: "Ajustes de design que o Yan quer fazer no app", status: "aberta", responsavel: "Yan", nota: "Itens específicos ainda não anotados", atualizado: "2026-07-11" },
  { id: "z17", workspace: "zuppas", projeto: "App Serena Mente Feliz", titulo: "Definir data de lançamento", status: "aberta", responsavel: "Yan", atualizado: "2026-07-08" },

  // Método Cálice
  { id: "z18", workspace: "zuppas", projeto: "Método Cálice", titulo: "Ge gravar áudios (Dias 3, 5, 9) e vídeo (Dia 7) das aulas práticas", status: "aberta", responsavel: "Ge", atualizado: "2026-07-08" },

  // Consciente Momento
  { id: "z19", workspace: "zuppas", projeto: "Consciente Momento", titulo: "Definir banco de imagens/preset visual alinhado ao Serena", status: "aberta", responsavel: "Yan", atualizado: "2026-06-22" },
  { id: "z20", workspace: "zuppas", projeto: "Consciente Momento", titulo: "Adicionar URL de captura da Liz no link da bio", status: "aberta", responsavel: "Yan", atualizado: "2026-06-22" },
  { id: "z21", workspace: "zuppas", projeto: "Consciente Momento", titulo: "Preencher métricas do 1º post no Registro de Conteúdo", status: "aberta", responsavel: "Yan", atualizado: "2026-06-22" },

  // Família
  { id: "z22", workspace: "zuppas", projeto: "Família", titulo: "Revisar a rotina com todos os Zuppas (17/06 passou, reagendar)", status: "aberta", responsavel: "Yan", atualizado: "2026-06-17" },

  // Vault / manutenção
  { id: "z23", workspace: "zuppas", projeto: "Vault", titulo: "Decidir limpeza do histórico Git das credenciais + rotação de chaves", status: "aberta", responsavel: "Yan", nota: "Não urgente — repo local, sem remote", atualizado: "2026-07-03" },
  { id: "z24", workspace: "zuppas", projeto: "Vault", titulo: "Push do Vault Zuppas e do Vault Appyon pra remoto privado (GitHub)", status: "aberta", responsavel: "Yan", nota: "Quando precisar sincronizar entre 2 máquinas", atualizado: "2026-07-05" },
  { id: "z25", workspace: "zuppas", projeto: "Vault", titulo: "Tarefa - Swipe File (Ge): cancelar, reatribuir ou manter?", status: "bloqueada", responsavel: "Ge", nota: "Delegada há 66+ dias, parece superada — Ge hoje é dona do Método Cálice", atualizado: "2026-05-08" },
];

// Extraído do Vault Appyon: 20 - Tasks/0. Index.md (13/07/2026)
const appyon: Task[] = [
  // Abertas — Email SMS
  { id: "a1", workspace: "appyon", projeto: "Email SMS", titulo: "Corrigir status enrollments.status = 'failed' fora do CHECK constraint", status: "aberta", responsavel: "Yan", atualizado: "2026-07-13" },
  { id: "a2", workspace: "appyon", projeto: "Email SMS", titulo: "Investigar timeout no detalhe de automação (aba Métricas)", status: "aberta", responsavel: "Yan", atualizado: "2026-07-13" },
  { id: "a3", workspace: "appyon", projeto: "Email SMS", titulo: "Checar dashboard Resend pós-janela de risco", status: "aberta", responsavel: "Yan", atualizado: "2026-07-13" },
  { id: "a4", workspace: "appyon", projeto: "Email SMS", titulo: "Investigar posicionamento de inbox (spam-promotions)", status: "aberta", responsavel: "Yan", atualizado: "2026-07-13" },
  { id: "a5", workspace: "appyon", projeto: "Email SMS", titulo: "Botão agregado de pausa de emergência", status: "aberta", responsavel: "Yan", atualizado: "2026-07-13" },
  { id: "a6", workspace: "appyon", projeto: "Email SMS", titulo: "Configurar pools nas automações restantes", status: "aberta", responsavel: "Yan", atualizado: "2026-07-13" },
  { id: "a7", workspace: "appyon", projeto: "Email SMS", titulo: "Registrar domínios no Google Postmaster Tools", status: "aberta", responsavel: "Yan", atualizado: "2026-07-13" },
  { id: "a8", workspace: "appyon", projeto: "Email SMS", titulo: "Automação para flow Abandono-ST-Inglês-Creators", status: "aberta", responsavel: "Yan", atualizado: "2026-07-13" },
  { id: "a9", workspace: "appyon", projeto: "Email SMS", titulo: "Confirmar fix visual de overflow no editor", status: "aberta", responsavel: "Yan", atualizado: "2026-07-13" },
  { id: "a10", workspace: "appyon", projeto: "Email SMS", titulo: "Backlog baixa prioridade - Email SMS", status: "aberta", responsavel: "Yan", atualizado: "2026-07-13" },
  { id: "a11", workspace: "appyon", projeto: "Email SMS", titulo: "Investigar deliverability zona innerhealth.online (open rate baixo)", status: "aberta", responsavel: "Yan", nota: "Cap reduzido pra 250/dia em 09/07", atualizado: "2026-07-10" },
  { id: "a12", workspace: "appyon", projeto: "Email SMS", titulo: "Testar IP dedicado no Resend", status: "aberta", responsavel: "Yan", nota: "Aguardando operação estabilizar antes de confirmar add-on $60/mês", atualizado: "2026-07-08" },
  { id: "a13", workspace: "appyon", projeto: "Email SMS", titulo: "Recuperar open rate (queda pós-warmup)", status: "aberta", responsavel: "Yan", nota: "Queda de >20% para 8,2%, métrica prioritária da semana", atualizado: "2026-07-11" },
  { id: "a14", workspace: "appyon", projeto: "Email SMS", titulo: "Ativar automação de email para leads do Google", status: "aberta", responsavel: "Yan", nota: "Hoje só cobre Creators", atualizado: "2026-07-09" },
  { id: "a15", workspace: "appyon", projeto: "Email SMS", titulo: "Montar proposta de segmentação avançada de email (objetivo + engajamento)", status: "aberta", responsavel: "Yan", atualizado: "2026-07-09" },
  { id: "a16", workspace: "appyon", projeto: "Email SMS", titulo: "Adicionar inbox de reply (MX + Cloudflare Email Routing)", status: "aberta", responsavel: "Yan", nota: "Baixa prioridade, deliberadamente adiada", atualizado: "2026-07-07" },
  { id: "a17", workspace: "appyon", projeto: "Email SMS", titulo: "Suportar múltiplas condições de saída (exit_tag) na automação", status: "aberta", responsavel: "Yan", nota: "52 casos cross-produto presos hoje", atualizado: "2026-07-09" },

  // Abertas — Google Ads Tracking
  { id: "a18", workspace: "appyon", projeto: "Google Ads Tracking", titulo: "Confirmar match das 6 conversões Safari", status: "aberta", responsavel: "João", atualizado: "2026-07-08" },
  { id: "a19", workspace: "appyon", projeto: "Google Ads Tracking", titulo: "Corrigir valor inflado via Conversion Adjustments", status: "aberta", responsavel: "Yan", atualizado: "2026-07-08" },
  { id: "a20", workspace: "appyon", projeto: "Google Ads Tracking", titulo: "Aplicar MODELO GADS no RedTrack", status: "aberta", responsavel: "Yan", atualizado: "2026-07-08" },

  // Abertas — Afiliados Creators
  { id: "a21", workspace: "appyon", projeto: "Afiliados Creators", titulo: "Confirmar links pendentes do SOP de Tickets (escalonamento e demanda técnica)", status: "aberta", responsavel: "Pedro", nota: "Gap aberto desde 07/07, nunca cobrado do Cefas/Pedro", atualizado: "2026-07-13" },

  // Abertas — Organizacional
  { id: "a22", workspace: "appyon", projeto: "Organizacional", titulo: "Iniciar frente de Produto (JD)", status: "aberta", responsavel: "Yan", nota: "Frente 3 do JD, zero rastreamento desde 07/07", atualizado: "2026-07-13" },
  { id: "a23", workspace: "appyon", projeto: "Organizacional", titulo: "Iniciar frente de Automações e Otimizações (JD)", status: "aberta", responsavel: "Yan", nota: "Frente 5 do JD, zero rastreamento desde 07/07", atualizado: "2026-07-13" },

  // Abertas — Funis AppyonFlow
  { id: "a24", workspace: "appyon", projeto: "Funis AppyonFlow", titulo: "Configurar SM-V21 Birth Chart Tarot para YouTube", status: "aberta", responsavel: "Yan", nota: "Creators fechado, falta versão YouTube", atualizado: "2026-07-13" },
  { id: "a25", workspace: "appyon", projeto: "Funis AppyonFlow", titulo: "Investigar inconsistência de preço e assinatura no paywall (SM-V16)", status: "aberta", responsavel: "Yan", atualizado: "2026-07-09" },

  // Em andamento
  { id: "a26", workspace: "appyon", projeto: "Google Ads Tracking", titulo: "Investigar divergência de custo entre RedTrack e Google Ads Manager", status: "em-andamento", responsavel: "João", atualizado: "2026-07-13" },
  { id: "a27", workspace: "appyon", projeto: "Afiliados Creators", titulo: "Assumir gestão diária de tickets - Afiliados Creators", status: "em-andamento", responsavel: "Yan", nota: "Rotina rodando desde 07/07 — caso urgente Maraisa resolvido, virou Procedimento 5 do SOP", atualizado: "2026-07-13" },
  { id: "a28", workspace: "appyon", projeto: "Email SMS", titulo: "Verificar remoção de compradores do fluxo sem erro", status: "em-andamento", responsavel: "Yan", nota: "18% dos compradores sem tag, 506 corrigidos via backfill, aguardando aprovação do Pedro", atualizado: "2026-07-12" },
  { id: "a29", workspace: "appyon", projeto: "Email SMS", titulo: "Aumentar cap do msg gradualmente (monitorando bounce)", status: "em-andamento", responsavel: "Yan", atualizado: "2026-07-08" },
  { id: "a30", workspace: "appyon", projeto: "Email SMS", titulo: "Redesenhar Métricas - cards por automação e visão por domínio", status: "em-andamento", responsavel: "Yan", nota: "Frente 1 fechada, Frente 2 (domínio×dia) não iniciada", atualizado: "2026-07-09" },
  { id: "a31", workspace: "appyon", projeto: "Email SMS", titulo: "Claim pool-aware (evitar starvation FIFO entre pools)", status: "em-andamento", responsavel: "Yan", nota: "Fix em produção, falta confirmar que drenou sem travar de novo", atualizado: "2026-07-10" },
  { id: "a32", workspace: "appyon", projeto: "Email SMS", titulo: "Investigar enrollments travados (3k+3,8k, 08-07)", status: "em-andamento", responsavel: "Yan", atualizado: "2026-07-12" },
  { id: "a33", workspace: "appyon", projeto: "Email SMS", titulo: "Pacing por janela horária (Pool B)", status: "em-andamento", responsavel: "Yan", nota: "Publicado, aguardando validação por query real", atualizado: "2026-07-12" },
  { id: "a34", workspace: "appyon", projeto: "Email SMS", titulo: "Implementar split de teste A-B", status: "em-andamento", responsavel: "Yan", nota: "F2 em produção real, 525 leads migrados e validados", atualizado: "2026-07-13" },
  { id: "a35", workspace: "appyon", projeto: "Email SMS", titulo: "Auditoria completa da plataforma Appyon Monetização", status: "em-andamento", responsavel: "Yan", nota: "Frentes 0-3 concluídas, faltam 4-6", atualizado: "2026-07-10" },
  { id: "a36", workspace: "appyon", projeto: "Email SMS", titulo: "Avaliar API de verificação de lead pré-envio (DeBounce)", status: "em-andamento", responsavel: "Yan", nota: "Em produção, falta checagem 24h + monitorar saldo de créditos", atualizado: "2026-07-13" },
  { id: "a37", workspace: "appyon", projeto: "Email SMS", titulo: "Integrar RedTrack - campaign ID por automação-node", status: "em-andamento", responsavel: "Yan", nota: "Falta só Yan testar pessoalmente na automação real", atualizado: "2026-07-11" },
  { id: "a38", workspace: "appyon", projeto: "Funis AppyonFlow", titulo: "Subir oferta EX-BACK READING no AppyonFlow", status: "em-andamento", responsavel: "Iorhan", nota: "Parte técnica avançando, falta entrega do Iorhan (depoimentos, paywall, upsells)", atualizado: "2026-07-11" },

  // Bloqueadas
  { id: "a39", workspace: "appyon", projeto: "Email SMS", titulo: "SMS - Provedor e registro Brand 10DLC", status: "bloqueada", responsavel: "Pedro", nota: "Pedro cobrando ritmo, falta confirmar dados de endereço/DBA", atualizado: "2026-07-13" },
  { id: "a40", workspace: "appyon", projeto: "Email SMS", titulo: "Retry, backoff e DLQ no Appyon Flow", status: "bloqueada", responsavel: "Pedro", nota: "Depende de decisão/pedido ao Pedro", atualizado: "2026-07-08" },
  { id: "a41", workspace: "appyon", projeto: "Google Ads Tracking", titulo: "Aguardar resposta do João sobre achados de tracking", status: "bloqueada", responsavel: "João", nota: "Pausado até volume maior", atualizado: "2026-07-08" },
  { id: "a42", workspace: "appyon", projeto: "Google Ads Tracking", titulo: "Decidir automação real RedTrack-Google Ads API", status: "bloqueada", responsavel: "Yan", nota: "Condicional ao fechamento de outra task", atualizado: "2026-07-08" },

  // Concluídas (amostra recente)
  { id: "a43", workspace: "appyon", projeto: "Organizacional", titulo: "Preparar call 1-1 com Pedro (JD Coordenador de Infraestrutura)", status: "concluida", responsavel: "Yan", atualizado: "2026-07-07" },
  { id: "a44", workspace: "appyon", projeto: "Funis AppyonFlow", titulo: "Criar variante GENDER - Soulmate Tarot e Soulmate Match", status: "concluida", responsavel: "Yan", atualizado: "2026-07-06" },
  { id: "a45", workspace: "appyon", projeto: "Email SMS", titulo: "Analisar engajamento cruzado (Email-1 → Email-2-3)", status: "concluida", responsavel: "Yan", atualizado: "2026-07-05" },
  { id: "a46", workspace: "appyon", projeto: "Email SMS", titulo: "Suprimir contato já no 1º soft bounce", status: "concluida", responsavel: "Yan", atualizado: "2026-07-04" },
];

export const mockTasks: Task[] = [...zuppas, ...appyon];
