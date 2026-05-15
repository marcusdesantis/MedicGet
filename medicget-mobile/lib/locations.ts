/**
 * Catálogo de países + provincias/estados que la app soporta inicialmente.
 *
 * Es estático porque:
 *   • Nominatim (OSM) no tiene un endpoint de "provincias por país" estable
 *   • Las APIs gratuitas tipo restcountries.com no devuelven subdivisiones
 *   • Bundlearlo es ~5 KB gzip y no requiere red — más rápido y offline-safe
 *
 * Cada provincia tiene `lat`/`lng` aproximados (capital de la provincia)
 * para auto-centrar el mapa cuando el usuario la elige antes de marcar
 * el punto exacto.
 *
 * Para agregar más países: replicá la estructura. La UI los toma vivos
 * sin necesidad de cambiar nada más.
 */

export interface Province {
  code: string;       // identificador interno (ISO 3166-2 cuando existe)
  name: string;       // nombre que ve el usuario
  lat:  number;
  lng:  number;
}

export interface Country {
  code:    string;    // ISO 3166-1 alpha-2
  name:    string;    // nombre en español
  flag:    string;    // emoji bandera
  /** Centro geográfico — usado cuando el usuario eligió país pero no provincia. */
  center:  { lat: number; lng: number };
  /** Zoom inicial del mapa al entrar al país (sin provincia). */
  zoom:    number;
  provinces: Province[];
}

export const COUNTRIES: Country[] = [
  {
    code: 'EC',
    name: 'Ecuador',
    flag: '🇪🇨',
    center: { lat: -1.831239, lng: -78.183406 },
    zoom: 7,
    provinces: [
      { code: 'EC-A',  name: 'Azuay',                    lat: -2.890534, lng: -78.997475 },
      { code: 'EC-B',  name: 'Bolívar',                  lat: -1.595639, lng: -79.005543 },
      { code: 'EC-F',  name: 'Cañar',                    lat: -2.560000, lng: -78.940000 },
      { code: 'EC-C',  name: 'Carchi',                   lat:  0.812917, lng: -77.717917 },
      { code: 'EC-X',  name: 'Cotopaxi',                 lat: -0.933333, lng: -78.616667 },
      { code: 'EC-H',  name: 'Chimborazo',               lat: -1.671820, lng: -78.654661 },
      { code: 'EC-O',  name: 'El Oro',                   lat: -3.260000, lng: -79.960000 },
      { code: 'EC-E',  name: 'Esmeraldas',               lat:  0.968333, lng: -79.651667 },
      { code: 'EC-G',  name: 'Guayas',                   lat: -2.170998, lng: -79.922359 },
      { code: 'EC-I',  name: 'Imbabura',                 lat:  0.350000, lng: -78.122222 },
      { code: 'EC-L',  name: 'Loja',                     lat: -3.993117, lng: -79.204453 },
      { code: 'EC-R',  name: 'Los Ríos',                 lat: -1.804167, lng: -79.534722 },
      { code: 'EC-M',  name: 'Manabí',                   lat: -1.054444, lng: -80.452500 },
      { code: 'EC-S',  name: 'Morona Santiago',          lat: -2.310000, lng: -78.120000 },
      { code: 'EC-N',  name: 'Napo',                     lat: -0.992500, lng: -77.815833 },
      { code: 'EC-D',  name: 'Orellana',                 lat: -0.467500, lng: -76.987500 },
      { code: 'EC-Y',  name: 'Pastaza',                  lat: -1.480000, lng: -78.000000 },
      { code: 'EC-P',  name: 'Pichincha',                lat: -0.180653, lng: -78.467838 },
      { code: 'EC-SE', name: 'Santa Elena',              lat: -2.226667, lng: -80.858333 },
      { code: 'EC-SD', name: 'Santo Domingo de los Tsáchilas', lat: -0.252222, lng: -79.175556 },
      { code: 'EC-U',  name: 'Sucumbíos',                lat:  0.083333, lng: -76.883333 },
      { code: 'EC-T',  name: 'Tungurahua',               lat: -1.245833, lng: -78.620833 },
      { code: 'EC-Z',  name: 'Zamora Chinchipe',         lat: -4.066667, lng: -78.950000 },
      { code: 'EC-W',  name: 'Galápagos',                lat: -0.953333, lng: -90.965000 },
    ],
  },
  {
    code: 'PE',
    name: 'Perú',
    flag: '🇵🇪',
    center: { lat: -9.189967, lng: -75.015152 },
    zoom: 6,
    provinces: [
      { code: 'PE-AMA', name: 'Amazonas',     lat: -6.231900, lng: -77.871900 },
      { code: 'PE-ANC', name: 'Áncash',       lat: -9.527800, lng: -77.527800 },
      { code: 'PE-APU', name: 'Apurímac',     lat: -14.054200, lng: -73.087500 },
      { code: 'PE-ARE', name: 'Arequipa',     lat: -16.398900, lng: -71.536900 },
      { code: 'PE-AYA', name: 'Ayacucho',     lat: -13.158900, lng: -74.223300 },
      { code: 'PE-CAJ', name: 'Cajamarca',    lat: -7.163800, lng: -78.500000 },
      { code: 'PE-CAL', name: 'Callao',       lat: -12.056400, lng: -77.118100 },
      { code: 'PE-CUS', name: 'Cusco',        lat: -13.531900, lng: -71.967200 },
      { code: 'PE-HUV', name: 'Huancavelica', lat: -12.787800, lng: -74.973100 },
      { code: 'PE-HUC', name: 'Huánuco',      lat: -9.926900, lng: -76.241100 },
      { code: 'PE-ICA', name: 'Ica',          lat: -14.067700, lng: -75.728600 },
      { code: 'PE-JUN', name: 'Junín',        lat: -12.065800, lng: -75.204900 },
      { code: 'PE-LAL', name: 'La Libertad',  lat: -8.115000, lng: -79.029200 },
      { code: 'PE-LAM', name: 'Lambayeque',   lat: -6.770100, lng: -79.844500 },
      { code: 'PE-LIM', name: 'Lima',         lat: -12.046400, lng: -77.042800 },
      { code: 'PE-LOR', name: 'Loreto',       lat: -3.749200, lng: -73.253800 },
      { code: 'PE-MDD', name: 'Madre de Dios', lat: -12.593300, lng: -69.189600 },
      { code: 'PE-MOQ', name: 'Moquegua',     lat: -17.193900, lng: -70.935600 },
      { code: 'PE-PAS', name: 'Pasco',        lat: -10.682800, lng: -76.255800 },
      { code: 'PE-PIU', name: 'Piura',        lat:  -5.194500, lng: -80.632800 },
      { code: 'PE-PUN', name: 'Puno',         lat: -15.840200, lng: -70.028900 },
      { code: 'PE-SAM', name: 'San Martín',   lat:  -6.484400, lng: -76.366300 },
      { code: 'PE-TAC', name: 'Tacna',        lat: -18.014700, lng: -70.252000 },
      { code: 'PE-TUM', name: 'Tumbes',       lat:  -3.566900, lng: -80.451500 },
      { code: 'PE-UCA', name: 'Ucayali',      lat:  -8.379100, lng: -74.553800 },
    ],
  },
  {
    code: 'CO',
    name: 'Colombia',
    flag: '🇨🇴',
    center: { lat: 4.570868, lng: -74.297333 },
    zoom: 6,
    provinces: [
      { code: 'CO-AMA', name: 'Amazonas',         lat: -1.443100, lng: -71.572400 },
      { code: 'CO-ANT', name: 'Antioquia',        lat:  6.244203, lng: -75.581212 },
      { code: 'CO-ARA', name: 'Arauca',           lat:  6.547100, lng: -71.000400 },
      { code: 'CO-ATL', name: 'Atlántico',        lat: 10.683200, lng: -74.881100 },
      { code: 'CO-BOL', name: 'Bolívar',          lat:  9.007900, lng: -74.476800 },
      { code: 'CO-BOY', name: 'Boyacá',           lat:  5.454600, lng: -73.362000 },
      { code: 'CO-CAL', name: 'Caldas',           lat:  5.298300, lng: -75.243800 },
      { code: 'CO-CAQ', name: 'Caquetá',          lat:  0.866200, lng: -73.815700 },
      { code: 'CO-CAS', name: 'Casanare',         lat:  5.752100, lng: -71.578600 },
      { code: 'CO-CAU', name: 'Cauca',            lat:  2.705000, lng: -76.825100 },
      { code: 'CO-CES', name: 'Cesar',            lat:  9.331400, lng: -73.652000 },
      { code: 'CO-CHO', name: 'Chocó',            lat:  5.692400, lng: -76.658100 },
      { code: 'CO-COR', name: 'Córdoba',          lat:  8.748100, lng: -75.881400 },
      { code: 'CO-CUN', name: 'Cundinamarca',     lat:  4.710900, lng: -74.072100 },
      { code: 'CO-DC',  name: 'Bogotá D.C.',      lat:  4.710900, lng: -74.072100 },
      { code: 'CO-GUA', name: 'Guainía',          lat:  2.585400, lng: -68.522200 },
      { code: 'CO-GUV', name: 'Guaviare',         lat:  2.043900, lng: -72.331100 },
      { code: 'CO-HUI', name: 'Huila',            lat:  2.531500, lng: -75.319200 },
      { code: 'CO-LAG', name: 'La Guajira',       lat: 11.354800, lng: -72.520500 },
      { code: 'CO-MAG', name: 'Magdalena',        lat: 10.413700, lng: -74.405600 },
      { code: 'CO-MET', name: 'Meta',             lat:  3.531700, lng: -73.075800 },
      { code: 'CO-NAR', name: 'Nariño',           lat:  1.289400, lng: -77.357700 },
      { code: 'CO-NSA', name: 'Norte de Santander', lat: 7.907100, lng: -72.504700 },
      { code: 'CO-PUT', name: 'Putumayo',         lat:  0.435900, lng: -75.532200 },
      { code: 'CO-QUI', name: 'Quindío',          lat:  4.461400, lng: -75.668000 },
      { code: 'CO-RIS', name: 'Risaralda',        lat:  4.813300, lng: -75.696100 },
      { code: 'CO-SAP', name: 'San Andrés',       lat: 12.583900, lng: -81.711200 },
      { code: 'CO-SAN', name: 'Santander',        lat:  6.643700, lng: -73.654600 },
      { code: 'CO-SUC', name: 'Sucre',            lat:  9.302300, lng: -75.397700 },
      { code: 'CO-TOL', name: 'Tolima',           lat:  4.094300, lng: -75.155500 },
      { code: 'CO-VAC', name: 'Valle del Cauca',  lat:  3.800600, lng: -76.641700 },
      { code: 'CO-VAU', name: 'Vaupés',           lat:  0.851900, lng: -70.812000 },
      { code: 'CO-VID', name: 'Vichada',          lat:  4.423300, lng: -69.287200 },
    ],
  },
  {
    code: 'AR',
    name: 'Argentina',
    flag: '🇦🇷',
    center: { lat: -38.416097, lng: -63.616672 },
    zoom: 4,
    provinces: [
      { code: 'AR-C', name: 'Ciudad Autónoma de Buenos Aires', lat: -34.603700, lng: -58.381600 },
      { code: 'AR-B', name: 'Buenos Aires',     lat: -36.676500, lng: -60.549400 },
      { code: 'AR-K', name: 'Catamarca',        lat: -28.469600, lng: -65.778900 },
      { code: 'AR-H', name: 'Chaco',            lat: -27.452200, lng: -58.987200 },
      { code: 'AR-U', name: 'Chubut',           lat: -43.881900, lng: -69.075600 },
      { code: 'AR-X', name: 'Córdoba',          lat: -31.420800, lng: -64.188800 },
      { code: 'AR-W', name: 'Corrientes',       lat: -28.467600, lng: -57.987300 },
      { code: 'AR-E', name: 'Entre Ríos',       lat: -32.014800, lng: -59.262100 },
      { code: 'AR-P', name: 'Formosa',          lat: -25.792300, lng: -59.287400 },
      { code: 'AR-Y', name: 'Jujuy',            lat: -23.310600, lng: -65.778900 },
      { code: 'AR-L', name: 'La Pampa',         lat: -36.617100, lng: -64.283800 },
      { code: 'AR-F', name: 'La Rioja',         lat: -29.413100, lng: -67.085200 },
      { code: 'AR-M', name: 'Mendoza',          lat: -34.169600, lng: -68.412300 },
      { code: 'AR-N', name: 'Misiones',         lat: -27.428100, lng: -55.166500 },
      { code: 'AR-Q', name: 'Neuquén',          lat: -38.952500, lng: -68.058200 },
      { code: 'AR-R', name: 'Río Negro',        lat: -40.829500, lng: -63.026400 },
      { code: 'AR-A', name: 'Salta',            lat: -24.789200, lng: -65.410800 },
      { code: 'AR-J', name: 'San Juan',         lat: -31.537500, lng: -68.535400 },
      { code: 'AR-D', name: 'San Luis',         lat: -33.298100, lng: -66.337500 },
      { code: 'AR-Z', name: 'Santa Cruz',       lat: -49.314100, lng: -68.539900 },
      { code: 'AR-S', name: 'Santa Fe',         lat: -31.565900, lng: -60.694900 },
      { code: 'AR-G', name: 'Santiago del Estero', lat: -27.795100, lng: -64.261500 },
      { code: 'AR-V', name: 'Tierra del Fuego', lat: -54.807500, lng: -68.328500 },
      { code: 'AR-T', name: 'Tucumán',          lat: -26.808300, lng: -65.217700 },
    ],
  },
  {
    code: 'MX',
    name: 'México',
    flag: '🇲🇽',
    center: { lat: 23.634501, lng: -102.552784 },
    zoom: 5,
    provinces: [
      { code: 'MX-AGU', name: 'Aguascalientes',     lat: 21.885600, lng: -102.291700 },
      { code: 'MX-BCN', name: 'Baja California',    lat: 30.840600, lng: -115.283800 },
      { code: 'MX-BCS', name: 'Baja California Sur', lat: 26.044400, lng: -111.666200 },
      { code: 'MX-CAM', name: 'Campeche',           lat: 19.830100, lng: -90.534900 },
      { code: 'MX-CHP', name: 'Chiapas',            lat: 16.756900, lng: -93.129200 },
      { code: 'MX-CHH', name: 'Chihuahua',          lat: 28.632800, lng: -106.069100 },
      { code: 'MX-CMX', name: 'Ciudad de México',   lat: 19.432600, lng: -99.133200 },
      { code: 'MX-COA', name: 'Coahuila',           lat: 27.058600, lng: -101.706800 },
      { code: 'MX-COL', name: 'Colima',             lat: 19.245200, lng: -103.725000 },
      { code: 'MX-DUR', name: 'Durango',            lat: 24.501100, lng: -104.658900 },
      { code: 'MX-MEX', name: 'México',             lat: 19.357300, lng: -99.762800 },
      { code: 'MX-GUA', name: 'Guanajuato',         lat: 21.019000, lng: -101.257400 },
      { code: 'MX-GRO', name: 'Guerrero',           lat: 17.439200, lng: -99.545100 },
      { code: 'MX-HID', name: 'Hidalgo',            lat: 20.091500, lng: -98.762400 },
      { code: 'MX-JAL', name: 'Jalisco',            lat: 20.659700, lng: -103.349600 },
      { code: 'MX-MIC', name: 'Michoacán',          lat: 19.566900, lng: -101.706800 },
      { code: 'MX-MOR', name: 'Morelos',            lat: 18.681300, lng: -99.101300 },
      { code: 'MX-NAY', name: 'Nayarit',            lat: 21.751400, lng: -104.845500 },
      { code: 'MX-NLE', name: 'Nuevo León',         lat: 25.592200, lng: -99.996200 },
      { code: 'MX-OAX', name: 'Oaxaca',             lat: 17.073200, lng: -96.726600 },
      { code: 'MX-PUE', name: 'Puebla',             lat: 19.041400, lng: -98.206300 },
      { code: 'MX-QUE', name: 'Querétaro',          lat: 20.588800, lng: -100.388900 },
      { code: 'MX-ROO', name: 'Quintana Roo',       lat: 19.181700, lng: -88.479100 },
      { code: 'MX-SLP', name: 'San Luis Potosí',    lat: 22.156500, lng: -100.985500 },
      { code: 'MX-SIN', name: 'Sinaloa',            lat: 25.172100, lng: -107.479500 },
      { code: 'MX-SON', name: 'Sonora',             lat: 29.297200, lng: -110.331100 },
      { code: 'MX-TAB', name: 'Tabasco',            lat: 17.840900, lng: -92.618900 },
      { code: 'MX-TAM', name: 'Tamaulipas',         lat: 24.266900, lng: -98.836300 },
      { code: 'MX-TLA', name: 'Tlaxcala',           lat: 19.318100, lng: -98.237500 },
      { code: 'MX-VER', name: 'Veracruz',           lat: 19.173900, lng: -96.134200 },
      { code: 'MX-YUC', name: 'Yucatán',            lat: 20.709900, lng: -89.094300 },
      { code: 'MX-ZAC', name: 'Zacatecas',          lat: 23.345500, lng: -102.583300 },
    ],
  },
  {
    code: 'CL',
    name: 'Chile',
    flag: '🇨🇱',
    center: { lat: -35.675147, lng: -71.542969 },
    zoom: 4,
    provinces: [
      { code: 'CL-AP', name: 'Arica y Parinacota', lat: -18.479700, lng: -70.299300 },
      { code: 'CL-TA', name: 'Tarapacá',            lat: -20.214100, lng: -70.152200 },
      { code: 'CL-AN', name: 'Antofagasta',         lat: -23.652400, lng: -70.395500 },
      { code: 'CL-AT', name: 'Atacama',             lat: -27.366700, lng: -70.331300 },
      { code: 'CL-CO', name: 'Coquimbo',            lat: -29.954500, lng: -71.339100 },
      { code: 'CL-VS', name: 'Valparaíso',          lat: -33.047200, lng: -71.612700 },
      { code: 'CL-RM', name: 'Región Metropolitana', lat: -33.448900, lng: -70.669300 },
      { code: 'CL-LI', name: "O'Higgins",            lat: -34.170800, lng: -70.740400 },
      { code: 'CL-ML', name: 'Maule',                lat: -35.426400, lng: -71.665400 },
      { code: 'CL-NB', name: 'Ñuble',                lat: -36.605200, lng: -72.103600 },
      { code: 'CL-BI', name: 'Biobío',               lat: -37.473100, lng: -72.353800 },
      { code: 'CL-AR', name: 'La Araucanía',         lat: -38.738300, lng: -72.590200 },
      { code: 'CL-LR', name: 'Los Ríos',             lat: -39.819000, lng: -73.245700 },
      { code: 'CL-LL', name: 'Los Lagos',            lat: -41.471800, lng: -72.937400 },
      { code: 'CL-AI', name: 'Aysén',                lat: -45.571200, lng: -72.068500 },
      { code: 'CL-MA', name: 'Magallanes',           lat: -53.157700, lng: -70.911300 },
    ],
  },
];

/** Lookup helper: encuentra un país por código. */
export function findCountry(code?: string | null): Country | undefined {
  if (!code) return undefined;
  return COUNTRIES.find((c) => c.code === code || c.name === code);
}

/** Lookup helper: encuentra una provincia dentro de un país. */
export function findProvince(country: Country | undefined, name?: string | null): Province | undefined {
  if (!country || !name) return undefined;
  return country.provinces.find((p) => p.name === name || p.code === name);
}
