/*
 * COURSE page (/course): MOTION PRO, sold on Hotmart.
 * Text taken from motion-pros.com/vip (typos fixed, "8 anos" as on the
 * portfolio). Media in /public/course (converted from D:\_CURSO MOTION).
 */

export const COURSE = {
  name: "Motion Pro",
  checkout: "https://pay.hotmart.com/O107587766O?off=ekbnxysu",
  whatsapp:
    "https://api.whatsapp.com/send/?phone=5521967849102&text=Ol%C3%A1%21+Tudo+Bem%3F+Quero+saber+mais+sobre+o+curso+Motion+Pro%21&type=phone_number&app_absent=0",
  logo: { src: "/course/logo.webp", width: 900, height: 440 },
  /** Key art (grid + iridescent liquid): background of the hero and the pitch. */
  art: "/course/bg-art.webp",

  hero: {
    label: "[ Curso ] After Effects · Motion Design",
    titleTop: "Pense como um Motion",
    titleAccent: "Profissional!",
    text: "O MOTION PRO é direto ao ponto para você dominar o After Effects e se destacar no mercado de Motion!",
    cta: "Quero ser profissional!",
    video: { loop: "/course/anuncio-loop.mp4", full: "/course/anuncio.mp4", poster: "/course/anuncio.webp" },
  },

  facts: ["15 aulas", "3 módulos", "3 projetos guiados", "Plugin bônus", "Acesso vitalício", "Certificado"],

  modules: {
    title: "O que você vai aprender",
    text: "São 15 aulas, divididas em 3 módulos:",
    list: [
      {
        video: "/course/modulo-1.mp4",
        poster: "/course/modulo-1-poster.jpg",
        lessons: ["Introdução ao After", "Curvas de velocidade", "Objeto nulo", "Pré-comps", "[Bônus] Plugin"],
      },
      {
        video: "/course/modulo-2.mp4",
        poster: "/course/modulo-2-poster.jpg",
        lessons: ["Animação de texto", "Máscara e track matte", "Match cut", "Efeitos", "Animação de shapes e expressões"],
        note: "Com projeto prático",
      },
      {
        video: "/course/modulo-3.mp4",
        poster: "/course/modulo-3-poster.jpg",
        lessons: ["Projeto placar pt1", "Projeto placar pt2", "Animação estrelas", "Projeto intervalo pt1", "Projeto intervalo pt2"],
      },
    ],
  },

  offer: {
    title: "O que oferecemos",
    items: [
      { title: "Otimização", text: "Conhecer, configurar e otimizar o After Effects." },
      { title: "Zero ao avançado", text: "Vamos dos princípios básicos do Motion até técnicas avançadas!" },
      { title: "Aprenda na prática", text: "Aplicaremos tudo o que vimos nas aulas em 3 projetos para seu portfólio!" },
      { title: "+ Bônus", text: "Plugin MOTION PRO para facilitar e agilizar o seu workflow!" },
    ],
  },

  projects: {
    title: "3 projetos guiados",
    text: "Durante o curso te acompanharei do zero em 3 projetos. Você terá acesso a todos os arquivos de After Effects completos para cada projeto!",
    list: ["Chama Jogo", "Placar", "Tela de Intervalo"],
    video: { src: "/course/projetos.mp4", poster: "/course/projetos.webp" },
  },

  pitch: {
    title: "Desejo me tornar um profissional!",
    text: "Aprenda o que é preciso para trabalhar com grandes empresas, e recupere o DOBRO do valor investido já em seu primeiro projeto!",
    cta: "Garantir minha vaga",
    price: { from: "R$ 250", installments: "12x", whole: "15", cents: ",20", cash: "ou R$ 147,00 à vista" },
    payment: "Cartão em até 12x · Boleto · Pix",
  },

  testimonials: {
    title: "Opinião de quem testou o curso",
    list: [
      {
        quote:
          "Eu sempre achei que o After era impossível, mas as aulas mostraram exatamente o que precisa focar, perfeito pra mim que sou ansioso kkk principalmente sobre curva de velocidade, um mal necessário, minhas animações pararam de parecer travadas. Recomendo demais!!",
        name: "Daniel Cotrim",
        role: "Editor de vídeo",
        photo: "/course/aluno-daniel.webp",
      },
      {
        quote: "Nunca tinha encostado no programa, e agora consegui fazer minhas primeiras animações!",
        name: "Nathalia Teixeira",
        role: "Designer gráfico",
        photo: "/course/aluno-nathalia.webp",
      },
      {
        quote: "Achava que eu sabia me virar e nunca tinha parado pra estudar de fato, realmente muda tudo.",
        name: "Leonardo Ohnuma",
        role: "Designer gráfico",
        photo: "/course/aluno-leonardo.webp",
      },
    ],
  },

  lessons: {
    title: "Confira alguns trechos das aulas",
    video: { src: "/course/trechos.mp4", poster: "/course/trechos.webp" },
  },

  mentor: {
    title: "Conheça seu mentor",
    photo: { src: "/about/miguel-portrait.webp", width: 1080, height: 1000 },
    paragraphs: [
      "Sou Miguel Dario (@dario.motion). Em 8 anos de mercado, tive a honra de participar de inúmeros projetos, dentre eles, pacotes gráficos e projetos para o Brasileirão, Paulistão e CazéTV.",
      "Criei este curso para te ensinar em 15 aulas, do zero ao avançado. Em pouco tempo, você se tornará um profissional!",
      "Sem teorias inúteis, sem enrolação!",
    ],
  },

  faq: {
    title: "Dúvidas frequentes",
    list: [
      {
        q: "Posso pagar por cartão, boleto ou pix?",
        a: "Você pode pagar da forma que preferir! Inclusive combinar mais de uma forma de pagamento. No cartão, aceitamos até 12 parcelas!",
      },
      {
        q: "Quais projetos terei acesso?",
        a: "Durante o curso te acompanharei do zero em 3 projetos: uma animação Chama Jogo, um Placar e uma Tela de Intervalo. Você terá acesso a todos os arquivos de After Effects completos para cada projeto!",
      },
      {
        q: "O plugin MOTION PRO é gratuito?",
        a: "Para facilitar seu workflow, desenvolvi esse plugin e disponibilizo ele TOTALMENTE GRATUITO para todos que adquirirem o curso!",
      },
      {
        q: "Posso assistir o conteúdo até que dia?",
        a: "Uma vez comprado o curso, você terá acesso vitalício a todo material do curso e à comunidade MOTION PRO!",
      },
      { q: "Emite certificado?", a: "Concluindo todas as aulas, você pode emitir seu certificado de conclusão pelo site!" },
      {
        q: "Esse curso é ideal para mim?",
        a: "Se você deseja ingressar no mercado de Motion Design, aprimorar suas técnicas ou descobrir como profissionais da animação esportiva planejam seus projetos, esse curso foi feito para você!",
      },
      {
        q: "E se eu não gostar do material do curso?",
        a: "Sem questionamentos, sem compromisso! Caso se arrependa da compra, você terá acesso ao reembolso de 100% do valor em até 7 dias.",
      },
    ],
  },

  contact: { title: "Ainda com dúvidas?", text: "Entre em contato conosco!", cta: "WhatsApp" },
};
