// Fiches des partenaires affichées dans la fenêtre « logo cliquable ».
// Un lien (site, LinkedIn, contact) vide n'est pas affiché : complétez simplement les champs.
export interface Partner {
  id: string;
  name: string;
  role: string;
  logo: string;
  about: string;
  website: string;
  linkedin: string;
  contact: string; // adresse e-mail ou lien de contact
}

export const partners: Partner[] = [
  {
    id: 'jadara',
    name: 'Jadara Foundation',
    role: 'Porte-voix et bénéficiaire',
    logo: '/img/logo-jadara.png',
    about: "Association marocaine reconnue d'utilité publique (ex-Fondation Marocaine de l'Étudiant). Jadara permet à chaque jeune de construire son avenir avec confiance et ambition, sans que l'origine sociale ou géographique, le handicap ou le genre ne soient un frein. Plus de 4 445 bénéficiaires, 700 bénévoles et 150 partenaires. 100% des enchères de cette vente lui sont reversées.",
    website: 'https://jadara.ngo/en/',
    linkedin: 'https://www.linkedin.com/company/jadara-foundation/',
    contact: 'contact@jadara.foundation',
  },
  {
    id: 'agile',
    name: 'Agile en Med',
    role: 'Amplificateur événementiel',
    logo: '/img/logo-agile.png',
    about: "Association créée en 2019 qui organise chaque année une conférence sur l'agilité et la transformation digitale en Méditerranée. La 6e édition, « L'agilité à l'ère de l'IA », se tient le 12 décembre 2026 à l'Université Mundiapolis de Casablanca et accueille cette vente solidaire.",
    website: 'https://agileenmed.com/',
    linkedin: 'https://www.linkedin.com/company/agileenmed',
    contact: 'https://agileenmed.com/#contact',
  },
  {
    id: 'maltem',
    name: 'Maltem Africa',
    role: 'Caution corporate & RSE',
    logo: '/img/logo-maltem.png',
    about: "Cabinet de conseil qui accompagne les entreprises dans leur transformation digitale, en mêlant stratégie, technologie et design : agilité, data, UX, modernisation technologique et cybersécurité. Plus de 50 clients, et deux marques : Maltem Academy et Valkima. Maltem Africa soutient cette vente dans le cadre de son engagement sociétal.",
    website: 'https://africa.maltem.com/',
    linkedin: '',
    contact: '',
  },
];
