// src/utils/phAddresses.js
// Philippine Administrative Address Hierarchy: Region -> Province -> City/Municipality -> Barangay

export const PH_ADDRESS_DATA = {
  'NCR - National Capital Region': {
    'Metro Manila': {
      'Caloocan City': ['Barangay 1', 'Barangay 12', 'Bagong Silang', 'Camarin', 'Grace Park East', 'Grace Park West', 'Kaybiga', 'Llano', 'Maypajo', 'Sangandaan', 'Talipapa', 'Tala'],
      'Las Piñas City': ['Almanza Uno', 'Almanza Dos', 'BF International Village', 'Daniel Fajardo', 'Elias Aldana', 'Ilaya', 'Manuyo Uno', 'Pamplona Uno', 'Pamplona Tres', 'Pulang Lupa Uno', 'Talon Uno', 'Zapote'],
      'Makati City': ['Bangkal', 'Bel-Air', 'Carmona', 'Dasmarinas', 'Forbes Park', 'Guadalupe Nuevo', 'Guadalupe Viejo', 'Legazpi Village', 'Magallanes', 'Olympia', 'Palanan', 'Pio del Pilar', 'Poblacion', 'Salcedo Village', 'San Antonio', 'San Isidro', 'San Lorenzo', 'Urdaneta', 'Valenzuela'],
      'Malabon City': ['Acacia', 'Baritan', 'Bayan-bayanan', 'Catmon', 'Concepcion', 'Dampalit', 'Flores', 'Hulong Duhat', 'Longos', 'Maysilo', 'Muzon', 'Potrero', 'Santolan', 'Tañong', 'Tinajeros', 'Tugatog'],
      'Mandaluyong City': ['Addition Hills', 'Bagong Silang', 'Barangka Drive', 'Barangka Ibaba', 'Barangka Ilaya', 'Barangka Itaas', 'Buayang Bato', 'Highway Hills', 'Hulo', 'Mabini-J. Rizal', 'Malamig', 'Mauway', 'Namayan', 'New Zañiga', 'Plainview', 'Pleasant Hills', 'Poblacion', 'Wack-Wack Greenhills'],
      'Manila City': ['Binondo', 'Ermita', 'Intramuros', 'Malate', 'Paco', 'Pandacan', 'Port Area', 'Quiapo', 'Sampaloc', 'San Andres', 'San Miguel', 'San Nicolas', 'Santa Ana', 'Santa Cruz', 'Santa Mesa', 'Tondo'],
      'Marikina City': ['Barangka', 'Calumpang', 'Concepcion Uno', 'Concepcion Dos', 'Fortune', 'Industrial Valley', 'Jesus Dela Peña', 'Malanday', 'Marikina Heights', 'Nangka', 'Parang', 'San Roque', 'Santa Elena', 'Santo Niño', 'Tañong', 'Tumana'],
      'Muntinlupa City': ['Alabang', 'Ayala Alabang', 'Bayanan', 'Buli', 'Cupang', 'Poblacion', 'Putatan', 'Sucat', 'Tunasan'],
      'Navotas City': ['Bagumbayan North', 'Bagumbayan South', 'Bangculasi', 'Daanghari', 'Navotas East', 'Navotas West', 'North Bay Boulevard North', 'North Bay Boulevard South', 'San Jose', 'San Rafael Village', 'San Roque', 'Sipac-Almacen', 'Tangos North', 'Tangos South', 'Tanza 1', 'Tanza 2'],
      'Parañaque City': ['Baclaran', 'BF Homes', 'Don Bosco', 'Don Galo', 'La Huerta', 'Marcelo Green', 'Merville', 'Moonwalk', 'San Antonio', 'San Dionisio', 'San Isidro', 'San Martin de Porres', 'Santo Niño', 'Sun Valley', 'Tambo', 'Vitalez'],
      'Pasay City': ['Baclaran', 'Barangay 1', 'Barangay 76 (MOA Complex)', 'Barangay 183 (Villamor)', 'Malibay', 'Maricaban', 'Pildera', 'San Isidro', 'San Jose', 'San Rafael', 'San Roque', 'Santa Clara'],
      'Pasig City': ['Bagong Ilog', 'Bagong Katipunan', 'Bambang', 'Buting', 'Caniogan', 'Dela Paz', 'Kalawaan', 'Kapasigan', 'Kapitolyo', 'Malinao', 'Manggahan', 'Maybunga', 'Oranbo', 'Palatiw', 'Pinagbuhatan', 'Pineda', 'Rosario', 'Sagad', 'San Antonio', 'San Joaquin', 'San Jose', 'San Miguel', 'San Nicolas (Poblacion)', 'Santa Cruz', 'Santa Lucia', 'Santa Rosa', 'Santo Tomas', 'Santolan', 'Sumilang', 'Ugong'],
      'Pateros': ['Aguho', 'Magtanggol', 'Martirez del 96', 'Poblacion', 'San Pedro', 'San Roque', 'Santa Ana', 'Santo Rosario-Kanluran', 'Santo Rosario-Silangan', 'Tabacalera'],
      'Quezon City': ['Alicia', 'Bagbag', 'Bagong Lipunan ng Crame', 'Bagong Pag-asa', 'Bagumbayan', 'Bahay Toro', 'Balingasa', 'Batasan Hills', ' Commonwealth', 'Cubao', 'Culiat', 'Diliman', 'Eastwood / Libis', 'Fairview', 'Holy Spirit', 'Kamuning', 'Katipunan / Loyola Heights', 'Krus Na Ligas', 'La Loma', 'Laging Handa', 'Matandang Balara', 'Novaliches Proper', 'Payatas', 'Pinyahan', 'Project 4', 'Project 6', 'Project 8', 'Sacred Heart', 'San Bartolome', 'Santa Mesa Heights', 'Santo Cristo', 'Santo Domingo', 'Sikatuna Village', 'South Triangle', 'Tandang Sora', 'Teachers Village East', 'Teachers Village West', 'Timog / Laging Handa', 'UP Campus', 'Valencia', 'West Triangle', 'White Plains'],
      'San Juan City': ['Addition Hills', 'Balong-Bato', 'Batis', 'Corazon de Jesus', 'Ermitaño', 'Greenhills', 'Isabelita', 'Kabayanan', 'Little Baguio', 'Maytunas', 'Onse', 'Pasadeña', 'Pedro Cruz', 'Progreso', 'Rivera', 'Salapan', 'San Perfecto', 'Santa Lucia', 'St. Joseph', 'Tibagan', 'West Crame'],
      'Taguig City': ['Bagumbayan', 'Bambang', 'Calzada', 'Central Bicutan', 'Central Signal Village', 'Fort Bonifacio (BGC)', 'Hagonoy', 'Ibayo-Tipas', 'Katuparan', 'Ligid-Tipas', 'Lower Bicutan', 'Maharlika Village', 'Napindan', 'New Lower Bicutan', 'North Daang Hari', 'North Signal Village', 'Palingon', 'Pinagsama', 'San Miguel', 'Santa Ana', 'South Daang Hari', 'South Signal Village', 'Tanyag', 'Tuktukan', 'Upper Bicutan', 'Ususan', 'Wawa', 'Western Bicutan'],
      'Valenzuela City': ['Arkong Bato', 'Bagbaguin', 'Balangkas', 'Bignay', 'Bisig', 'Canumay East', 'Canumay West', 'Coloong', 'Dalandanan', 'Gen. T. de Leon', 'Isla', 'Karuhatan', 'Lawang Bato', 'Lingunan', 'Mabolo', 'Malanday', 'Malinta', 'Mapulang Lupa', 'Marulas', 'Maysan', 'Palasan', 'Parada', 'Pariancillo Villa', 'Paso de Blas', 'Pasolo', 'Poblacion', 'Pulo', 'Punturin', 'Rincon', 'Tagalag', 'Ugong', 'Viente Reales', 'Wawang Pulo']
    }
  },
  'Region III - Central Luzon': {
    'Bulacan': {
      'Santa Maria': ['Bagbaguin', 'Balasing', 'Buenavista', 'Bulac', 'Camangyanan', 'Catmon', 'Cay Pombo', 'Caysio', 'Guyong', 'Lalakhan', 'Mag-asawang Sapa', 'Mahabang Parang', 'Mangga', 'Manggahan', 'Parada', 'Poblacion', 'Pulong Buhangin', 'San Gabriel', 'San Jose Patag', 'San Vicente', 'Santa Clara', 'Santa Cruz', 'Silangan', 'Tabing Bakod'],
      'Marilao': ['Abangan Norte', 'Abangan Sur', 'Ibayo', 'Lambakin', 'Lias', 'Loma de Gato', 'Nagbalon', 'Patubig', 'Poblacion I', 'Poblacion II', 'Prenza I', 'Prenza II', 'Santa Rosa I', 'Santa Rosa II', 'Saog', 'Tabing Ilog'],
      'Meycauayan City': ['Bagbaguin', 'Bahay Pare', 'Bancal', 'Banga', 'Bayugo', 'Caingin', 'Calvario', 'Camalig', 'Hulo', 'Iba', 'Langka', 'Lawa', 'Libtong', 'Liputan', 'Longos', 'Malhacan', 'Pajo', 'Pandayan', 'Pantoc', 'Perez', 'Poblacion', 'Saluysoy', 'St. Francis (Gasak)', 'Tugatog', 'Ubihan', 'Zamora'],
      'Bocaue': ['Antipona', 'Bagumbayan', 'Bambang', 'Batia', 'Biñang 1st', 'Biñang 2nd', 'Bolacan', 'Bundukan', 'Bunlo', 'Caingin', 'Duhat', 'Igulot', 'Lolomboy', 'Poblacion', 'Sulucan', 'Taal', 'Tambobong', 'Turo', 'Wakas'],
      'San Jose del Monte City': ['Assumption', 'Bagong Buhay I', 'Bagong Buhay II', 'Bagong Buhay III', 'Citrus', 'Ciudad Real', 'Dulong Bayan', 'Fatima I', 'Francisco Homes - Guijo', 'Francisco Homes - Mulawin', 'Francisco Homes - Narra', 'Francisco Homes - Yakal', 'Gaya-Gaya', 'Graceville', 'Gumaoc Central', 'Kaypian', 'Minuyan Proper', 'Muzon', 'Poblacion', 'San Manuel', 'San Martin I', 'San Pedro', 'San Rafael I', 'Santo Cristo', 'Sapang Palay Proper', 'Tungkong Mangga'],
      'Malolos City': ['Anilao', 'Atlag', 'Babatnin', 'Bagna', 'Bagong Bayan', 'Balayong', 'Balite', 'Bangkal', 'Barihan', 'Bulihan', 'Bungahan', 'Caingin', 'Calero', 'Caliligawan', 'Canalate', 'Caniogan', 'Catmon', 'Cofradia', 'Dakila', 'Guinhawa', 'Ligas', 'Longos', 'Look 1st', 'Look 2nd', 'Lugam', 'Mabolo', 'Mambog', 'Masile', 'Matimbo', 'Mojon', 'Namayan', 'Niugan', 'Pamarawan', 'Panasahan', 'Pinagbakahan', 'San Agustin', 'San Gabriel', 'San Juan', 'San Pablo', 'San Vicente (Poblacion)', 'Santiago', 'Santisima Trinidad', 'Santo Cristo', 'Santo Niño (Poblacion)', 'Santo Rosario (Poblacion)', 'Santor', 'Sumapang Bata', 'Sumapang Matanda', 'Taal', 'Tikay'],
      'Balagtas': ['Borol 1st', 'Borol 2nd', 'Dalig', 'Longos', 'Panginay', 'Pulong Gubat', 'San Juan', 'Santol', 'Wawa'],
      'Guiguinto': ['Cutcut', 'Daungan', 'Ilang-Ilang', 'Malis', 'Panginay', 'Poblacion', 'Pritil', 'Pulong Gubat', 'Santa Cruz', 'Santa Rita', 'Tabang', 'Tabe', 'Tiaong', 'Tuktukan'],
      'Pandi': ['Bagbaguin', 'Bagong Barrio', 'Baka-bakahan', 'Bunsuran I', 'Bunsuran II', 'Bunsuran III', 'Cacarong Bata', 'Cacarong Matanda', 'Cupang', 'Malibong Bata', 'Malibong Matanda', 'Manatal', 'Mapulang Lupa', 'Masagana', 'Masuso', 'Pinagkuartelan', 'Poblacion', 'Real de Cacarong', 'San Roque', 'Santo Niño', 'Siling Bata', 'Siling Matanda'],
      'Plaridel': ['Agnaya', 'Bagong Silang', 'Banga I', 'Banga II', 'Bintog', 'Bulihan', 'Culianin', 'Dampol', 'Lagundi', 'Lalangan', 'Lumang Bayan', 'Parulan', 'Poblacion', 'Rueda', 'San Jose', 'Santa Ines', 'Santo Niño', 'Sipat', 'Tabang'],
      'Baliwag City': ['Bagong Nayon', 'Barangca', 'Calantipay', 'Catulinan', 'Concepcion', 'Hinukay', 'Makinabang', 'Matangtubig', 'Pagala', 'Paitan', 'Piel', 'Pinagbarilan', 'Poblacion', 'Sabang', 'San Jose', 'San Roque', 'Santa Barbara', 'Santo Cristo', 'Santo Niño', 'Subic', 'Sulivan', 'Tangos', 'Tarcan', 'Tiaong', 'Tibag', 'Tilapayong', 'Virgen delas Flores'],
      'Angat': ['Banaban', 'Baybay', 'Binagbag', 'Donacion', 'Encanto', 'Laog', 'Marungko', 'Niugan', 'Paltok', 'Pulong Yantok', 'San Roque (Poblacion)', 'Santa Cruz (Poblacion)', 'Santa Lucia', 'Santo Cristo (Poblacion)', 'Sulucan', 'Taboc'],
      'Norzagaray': ['Bangkal', 'Baraka', 'Bigte', 'Bitungol', 'Friendship Village Resources', 'Matictic', 'Minuyan', 'Partida', 'Pinagtulayan', 'Poblacion', 'San Lorenzo', 'San Mateo', 'Tigbe'],
      'Bustos': ['Bonga Mayor', 'Bonga Menor', 'Buisan', 'Camachilihan', 'Cambaog', 'Catacte', 'Liciada', 'Malamig', 'Malawak', 'Poblacion', 'San Pedro', 'Talampas', 'Tanawan', 'Tibagan'],
      'San Rafael': ['BMA-Balagtas', 'Banca-banca', 'Caingin', 'Capihan', 'Coral na Bato', 'Cruz na Daan', 'Dagat-dagatan', 'Diliman I', 'Maguinao', 'Maronguillo', 'Paco', 'Pansumaloc', 'Pantubig', 'Pasong Bangkal', 'Pasong Callos', 'Pasong Intsik', 'Pinacpinacan', 'Poblacion', 'Pulo', 'Pulong Bayabas', 'Salapungan', 'Sampaloc', 'San Agustin', 'San Roque', 'Talacsan', 'Tambubong', 'Tukod', 'Ulingao'],
      'Pulilan': ['Balatong A', 'Balatong B', 'Cutcot', 'Dampol 1st', 'Dampol 2nd-A', 'Dampol 2nd-B', 'Dulong Malabon', 'Inaon', 'Longos', 'Lumbac', 'Paltao', 'Peñabatan', 'Poblacion', 'Santa Peregrina', 'Santo Cristo', 'Taal', 'Tibag', 'Tinejero'],
      'Calumpit': ['Balite', 'Balungao', 'Buguion', 'Bulusan', 'Calizon', 'Calumpang', 'Caniogan', 'Corazon', 'Frances', 'Gatbuca', 'Gugo', 'Iba Este', 'Iba O\'Este', 'Longos', 'Meysulao', 'Meyto', 'Palimbang', 'Panducot', 'Pio Cruzcosa', 'Poblacion', 'Pungo', 'San Jose', 'San Marcos', 'San Miguel', 'Santa Lucia', 'Santo Niño', 'Sapang Bayan', 'Sucol'],
      'Hagonoy': ['Abulalas', 'Carillo', 'Iba', 'Iba-Ibayo', 'Mercado', 'Palapat', 'Pugad', 'Sagrada Familia', 'San Agustin', 'San Isidro', 'San Jose', 'San Juan', 'San Miguel', 'San Nicolas', 'San Pablo', 'San Pascual', 'San Pedro', 'San Roque', 'San Sebastian', 'Santa Cruz', 'Santa Elena', 'Santa Monica', 'Santo Niño (Poblacion)', 'Santo Rosario', 'Tampok', 'Tibaguin'],
      'Obando': ['Binuangan', 'Catanghalan', 'Hulo', 'Lawa', 'Paco', 'Pag-asa (Poblacion)', 'Paliwas', 'Panghulo', 'Salambao', 'San Pascual', 'Tawiran'],
      'Paombong': ['Binakod', 'Kapitangan', 'Malumot', 'Masukol', 'Pinalagdan', 'Poblacion', 'San Isidro I', 'San Isidro II', 'San Jose', 'San Roque', 'San Vicente', 'Santa Cruz', 'Santo Niño', 'Santo Rosario'],
      'San Ildefonso': ['Akle', 'Alagao', 'Anyatam', 'Bagong Barrio', 'Basuit', 'Bubulong Malaki', 'Bubulong Munti', 'Buhol na Mangga', 'Bulusukan', 'Calasag', 'Calawitan', 'Casalat', 'Gabihan', 'Garlang', 'Lapnit', 'Maasim', 'Makapilapil', 'Malipampang', 'Mataas na Parang', 'Matimbubong', 'Nabaong Garlang', 'Palapala', 'Pasong Bangkal', 'Pinaod', 'Poblacion', 'Pulong Tamo', 'San Juan', 'Santa Catalina Bata', 'Santa Catalina Matanda', 'Sapang Dayap', 'Sapang Putik', 'Sapang Putol', 'Sumandig', 'Telepatio', 'Umpucan', 'Upig'],
      'San Miguel': ['Bagong Pag-asa', 'Bagong Silang', 'Balaong', 'Balite', 'Bantog', 'Bardias', 'Baritan', 'Batasan Bata', 'Batasan Matanda', 'Biak-na-Bato', 'Biclat', 'Buga', 'Buliran', 'Bulualto', 'Calumpang', 'Cambio', 'Camias', 'Ilog-Bulo', 'King Kabayo', 'Labne', 'Lambakin', 'Magmarale', 'Malibay', 'Maligaya', 'Mandile', 'Masalipit', 'Pacalag', 'Paliwasan', 'Partida', 'Pinambaran', 'Poblacion', 'Pulong Bayabas', 'Pulong Duhat', 'Sacdalan', 'Salacot', 'Salangan', 'San Agustin', 'San Jose', 'San Juan', 'San Vicente', 'Santa Ines', 'Santa Lucia', 'Santa Rita Bata', 'Santa Rita Matanda', 'Sapang', 'Sibul', 'Tartaro', 'Tibagan', 'Tigpalas']
    },
    'Pampanga': {
      'Angeles City': ['Agapito del Rosario', 'Anunas', 'Balibago', 'Capaya', 'Claro M. Recto', 'Cuayan', 'Cutcut', 'Cutud', 'Lourdes North West', 'Lourdes Sur', 'Malabanias', 'Margot', 'Mining', 'Pampang', 'Pandan', 'Pulung Cacutud', 'Pulung Maragul', 'Pulungbulu', 'Salapungan', 'San Jose', 'San Nicolas', 'Santa Teresita', 'Santo Cristo', 'Santo Domingo', 'Santo Rosario (Poblacion)', 'Sapalibutad', 'Sapangbato', 'Tabun'],
      'San Fernando City': ['Alasas', 'Baliti', 'Bulaon', 'Calulut', 'Del Carmen', 'Del Pilar', 'Del Rosario', 'Dolores', 'Juliana', 'Lara', 'Lourdes', 'Magliman', 'Maimpis', 'Malino', 'Malpitic', 'Pandaras', 'Panipuan', 'Pulung Bulu', 'Quebiawan', 'Saguin', 'San Agustin', 'San Felipe', 'San Isidro', 'San Jose', 'San Juan', 'San Nicolas', 'San Pedro', 'Santa Lucia', 'Santa Teresita', 'Santo Niño', 'Santo Rosario (Poblacion)', 'Sindalan', 'Telabastagan'],
      'Mabalacat City': ['Atlu-Bola', 'Bical', 'Bundagul', 'Cacutud', 'Calumpang', 'Camachiles', 'Dapdap', 'Dau', 'Dolores', 'Duquit', 'Lakandula', 'Mabiga', 'Macapagal Village', 'Mamatitang', 'Mangalit', 'Marcos Village', 'Mawaque', 'Paralayunan', 'Poblacion', 'San Francisco', 'San Joaquin', 'Santa Ines', 'Santa Maria', 'Santo Rosario', 'Sapang Balen', 'Sapang Biabas', 'Tabun'],
      'Apalit': ['Balucuc', 'Calantipe', 'Cansinala', 'Capalangan', 'Colgante', 'Paligui', 'Sampaloc', 'San Juan (Poblacion)', 'San Vicente', 'Sucad', 'Sulipan', 'Tabuyuc']
    },
    'Nueva Ecija': {
      'Cabanatuan City': ['Aduas Centro', 'Bantug Norte', 'Barrera District (Poblacion)', 'Bernardo District (Poblacion)', 'Bitas', 'Caalibangbangan', 'Cabu', 'Camp Tinio', 'Kapitan Pepe', 'Mabini Homesite', 'Mayapyap Sur', 'Sangitan', 'Sumacab Este', 'Valdefuente'],
      'Gapan City': ['Balante', 'Bayanihan', 'Bulak', 'Kapalangan', 'Mabuga', 'Mahipon', 'Makabaclay', 'Mangino', 'Marelo', 'Pambuan', 'Parcutela', 'Puting Tubig', 'San Lorenzo (Poblacion)', 'San Nicolas', 'San Roque', 'San Vicente (Poblacion)', 'Santa Cruz', 'Santo Cristo Norte', 'Santo Niño'],
      'San Jose City': ['Abar 1st', 'Bagong Sikat', 'Caanawan', 'Calaocan', 'F.E. Marcos (Poblacion)', 'Malasin', 'Palestina', 'Rafael Rueda Sr. (Poblacion)', 'San Agustin', 'Santo Niño 1st', 'Tondod']
    },
    'Tarlac': {
      'Tarlac City': ['Aguso', 'Alvindia Segundo', 'Amucao', 'Armenia', 'Asturias', 'Atioc', 'Balanti', 'Balete', 'Balibago I', 'Balingcanaway', 'Banaba', 'Bantog', 'Binauganan', 'Bora', 'Buenavista', 'Buhilit', 'Burot', 'Carangian', 'Central', 'Culipat', 'Cut-cut I', 'Dalayap', 'Dela Paz', 'Dolores', 'Ligtasan', 'Mabini', 'Maliwalo', 'Matatalaib', 'Poblacion', 'San Isidro', 'San Miguel', 'San Nicolas', 'San Rafael', 'San Roque', 'San Sebastian', 'San Vicente', 'Sepung Calzada', 'Tibag'],
      'Capas': ['Aranguren', 'Bueno', 'Cristo Rey', 'Cubcub (Poblacion)', 'Cutcut 1st', 'Cutcut 2nd', 'Dolores', 'Estrada', 'Lawy', 'Manga', 'Manlapig', 'Maruglu', 'O\'Donnell', 'Santa Juliana', 'Santa Lucia', 'Santa Rita', 'Santo Domingo 1st', 'Santo Domingo 2nd', 'Santo Rosario', 'Talaga']
    },
    'Bataan': {
      'Balanga City': ['Bagong Silang', 'Bagumbayan', 'Cabog-Cabog', 'Camacho', 'Cataning', 'Central', 'Cupang North', 'Cupang Proper', 'Cupang West', 'Dangcol', 'Doña Francisca', 'Ibayo', 'Lote', 'Malabia', 'Munting Batangas', 'Poblacion', 'Puerto Rivas Ibaba', 'San Jose', 'Sibacan', 'Talisay', 'Tanato', 'Tenejero', 'Tortugas', 'Tuyo'],
      'Mariveles': ['Alas-asin', 'Alion', 'Balon-Anito', 'Baseco Country', 'Batangas II', 'Biaan', 'Cabcaben', 'Camaya', 'Ipag', 'Lucanin', 'Malaya', 'Maligaya', 'Mt. View', 'Poblacion', 'San Carlos', 'San Isidro', 'Sisiman', 'Townsite']
    },
    'Zambales': {
      'Olongapo City': ['Asinan', 'Banicain', 'Barretto', 'East Bajac-bajac', 'East Tapinac', 'Gordon Heights', 'Kalaklan', 'Mabayuan', 'New Cabalan', 'New Ilalim', 'New Kababae', 'New Kalalake', 'Old Cabalan', 'Pag-asa', 'Santa Rita', 'West Bajac-bajac', 'West Tapinac'],
      'Subic': ['Aningway Sacatihan', 'Asinan Poblacion', 'Asinan Proper', 'Baraca-Camachile (Poblacion)', 'Batiawan', 'Calapacuan', 'Calapandayan (Poblacion)', 'Cawag', 'Ilwas (Poblacion)', 'Mangan-Vaca', 'Matain', 'Naugsol', 'Pamatawan', 'San Isidro', 'Santo Tomas', 'Wawandue (Poblacion)']
    },
    'Aurora': {
      'Baler': ['Barangay I (Poblacion)', 'Barangay II (Poblacion)', 'Barangay III (Poblacion)', 'Barangay IV (Poblacion)', 'Barangay V (Poblacion)', 'Buhangin', 'Calabuanan', 'Obligacion', 'Pingit', 'Reserva', 'Sabang', 'Suclayin', 'Zabali']
    }
  },
  'Region IV-A - CALABARZON': {
    'Cavite': {
      'Bacoor City': ['Alima', 'Aniban I', 'Habay I', 'Kaingin', 'Ligas I', 'Mambog I', 'Molino I', 'Molino II', 'Molino III', 'Molino IV', 'Niog I', 'Panapaan I', 'Queens Row Central', 'Real I', 'Salinas I', 'San Nicolas I', 'Talaba I', 'Zapote I'],
      'Dasmariñas City': ['Burol', 'Datu Esmael', 'Langkaan I', 'Langkaan II', 'Paliparan I', 'Paliparan II', 'Paliparan III', 'Salawag', 'Salitran I', 'Salitran II', 'Sampaloc I', 'Sampaloc II', 'San Agustin I', 'San Jose', 'Zone I (Poblacion)'],
      'Imus City': ['Alapan I-A', 'Anabu I-A', 'Anabu II-A', 'Bayan Luma I', 'Bucandala I', 'Carsadang Bago I', 'Malagasang I-A', 'Medicion I-A', 'Palico I', 'Pasong Buaya I', 'Poblacion I-A', 'Tanzang Luma I', 'Toclong I-A'],
      'Tagaytay City': ['Asisan', 'Bagong Tubig', 'Calabuso', 'Dapdap East', 'Francisco', 'Guinhawa North', 'Iruhin East', 'Kaybagal Central', 'kaybagal South (Poblacion)', 'Maharlika East', 'Maitim 2nd Central', 'Mendez Crossing East', 'Neogan', 'Patutong Malaki North', 'Sungay North', 'Tolentino East']
    },
    'Laguna': {
      'Calamba City': ['Bagong Kalsada', 'Bañadero', 'Banlic', 'Barandal', 'Batino', 'Bucal', 'Canlubang', 'Halang', 'Lawa', 'Lecheria', 'Makiling', 'Mayapa', 'Milagrosa', 'Paciano Rizal', 'Pansol', 'Parian', 'Poblacion 1', 'Punta', 'Real', 'Sampiruhan', 'Turbina'],
      'Santa Rosa City': ['Aplaya', 'Balibago', 'Caingin', 'Dila', 'Dita', 'Don Jose', 'Ibaba', 'Kanluran (Poblacion)', 'Labas', 'Macabling', 'Malitlit', 'Malusak (Poblacion)', 'Market Area (Poblacion)', 'Pooc', 'Pulong Santa Cruz', 'Santo Domingo', 'Sinalhan', 'Tagapo'],
      'Biñan City': ['Biñan (Poblacion)', 'Bungahan', 'Canlalay', 'Casile', 'De La Paz', 'Ganado', 'Langkiwa', 'Loma', 'Malaban', 'Malamig', 'Mampalasan', 'Platero', 'Poblacion', 'San Antonio', 'San Francisco', 'San Jose', 'San Vicente', 'Santo Domingo', 'Santo Niño', 'Soro-soro', 'Timbao', 'Tubigan', 'Zapote'],
      'San Pedro City': ['Bagong Silang', 'Calendola', 'Chrysanthemum', 'Cuyab', 'Estrella', 'Fatima', 'G.S.I.S.', 'Landayan', 'Langgam', 'Laram', 'Magsaysay', 'Maharlika', 'Narra', 'Nueva', 'Pacita 1', 'Pacita 2', 'Poblacion', 'Riverside', 'Rosario', 'Sampaguita Village', 'San Antonio', 'San Lorenzo Ruiz', 'San Roque', 'San Vicente', 'Santo Niño', 'United Bayanihan', 'United Better Living']
    },
    'Batangas': {
      'Batangas City': ['Alangilan', 'Balagtas', 'Bolbok', 'Calicanto', 'Cuta', 'Gulod Labac', 'Kumintang Ibaba', 'Kumintang Ilaya', 'Libjo', 'Pallocan West', 'Poblacion', 'San Isidro', 'Santa Clara', 'Santa Rita Karsada', 'Sorosoro Karsada'],
      'Lipa City': ['Antipolo del Norte', 'Ayala', 'Balintawak', 'Banaybanay', 'Bolbok', 'Bugtong na Pulo', 'Inosluban', 'Lodlod', 'Marawoy', 'Mataas na Lupa', 'Poblacion Barangay 1', 'Sabang', 'San Carlos', 'Sico', 'Tambo']
    },
    'Rizal': {
      'Antipolo City': ['Bagong Nayon', 'Beverly Hills', 'Calawis', 'Cupang', 'Dalig', 'Dela Paz (Poblacion)', 'Inarawan', 'Mambugan', 'Mayamot', 'Muntingdilaw', 'San Isidro (Poblacion)', 'San Jose (Poblacion)', 'San Luis', 'San Roque (Poblacion)', 'Santa Cruz', 'Taktak'],
      'Cainta': ['San Andres (Poblacion)', 'San Isidro', 'San Juan', 'San Roque', 'Santa Rosa', 'Santo Domingo', 'Santo Niño'],
      'Taytay': ['Dolores (Poblacion)', 'Muzon', 'San Isidro', 'San Juan', 'Santa Ana'],
      'Rodriguez (Montalban)': ['Balite (Poblacion)', 'Burgos', 'Geronimo', 'Macabud', 'Manggahan', 'Mascap', 'Puray', 'Rosario', 'San Isidro', 'San Jose', 'San Rafael']
    },
    'Quezon': {
      'Lucena City': ['Barangay 1 (Poblacion)', 'Bocohan', 'Cotta', 'Dalahican', 'Domoit', 'Gulang-Gulang', 'Ibabang Dupay', 'Ibabang Iyam', 'Ilayang Dupay', 'Ilayang Iyam', 'Isabang', 'Market View', 'Mayao Crossing']
    }
  },
  'Region I - Ilocos Region': {
    'Ilocos Norte': {
      'Laoag City': ['Barangay 1 San Lorenzo (Poblacion)', 'Barangay 10 San Jose (Poblacion)', 'Balacad', 'Buttong', 'Gabu Norte', 'La Paz', 'Suyo']
    },
    'Ilocos Sur': {
      'Vigan City': ['Barangay I (Poblacion)', 'Barangay IV (Poblacion)', 'Ayusan Norte', 'Mindoro', 'Pantay Daya', 'Tamag']
    },
    'La Union': {
      'San Fernando City': ['Barangay I (Poblacion)', 'Catbangen', 'Dalumpinas Oeste', 'Ilocanos Norte', 'Lingsat', 'Pagdaraoan', 'Poro', 'Sevilla', 'Tanqui']
    },
    'Pangasinan': {
      'Dagupan City': ['Bacayao Norte', 'Bonuan Binloc', 'Bonuan Boquig', 'Bonuan Gueset', 'Calmay', 'Caranglaan', 'Herrero', 'Lucao', 'Mayombo', 'Pantal', 'Poblacion Oeste', 'Tapuac'],
      'Urdaneta City': ['Anonas', 'Bactad East', 'Bayaoas', 'Camantiles', 'Catablan', 'Cayambanan', 'Dilan-Paurido', 'Mabanogbog', 'Nancamaliran East', 'Nancayasan', 'Pinmaludpod', 'Poblacion', 'San Jose', 'San Vicente']
    }
  },
  'CAR - Cordillera Administrative Region': {
    'Benguet': {
      'Baguio City': ['Aurora Hill Proper', 'Bakakeng Central', 'Bakakeng North', 'Burnham-Legarda', 'Camp 7', 'Camp 8', 'City Camp Central', 'Engineers Hill', 'Gibraltar', 'Guisad Central', 'Irisan', 'Kias', 'Loakan Proper', 'Mines View Park', 'Pacdal', 'Session Road Area', 'Trancoville'],
      'La Trinidad': ['Alapang', 'Alno', 'Ambiong', 'Bahong', 'Balili (Poblacion)', 'Beckel', 'Betag', 'Cruz', 'Lubas', 'Pico', 'Poblacion', 'Puguis', 'Shilan', 'Tawang', 'Wangal']
    }
  },
  'Region II - Cagayan Valley': {
    'Cagayan': {
      'Tuguegarao City': ['Annafunan East', 'Atulayan Norte', 'Bagay', 'Buntun', 'Caggay', 'Carig Norte', 'Carig Sur', 'caritan Centro', 'Centro 1 (Poblacion)', 'Pengue-Ruyu', 'San Gabriel', 'Tanza', 'Ugac Norte', 'Ugac Sur']
    },
    'Isabela': {
      'Santiago City': ['Abra', 'Balintocatoc', 'Batal', 'Buenavista', 'Calaocan', 'Centro East (Poblacion)', 'Centro West (Poblacion)', 'Dubinan East', 'Mabini', 'Malvar', 'Plaridel', 'Rizal', 'Rosario', 'Victory Norte'],
      'Cauayan City': ['Alicaocao', 'Alinam', 'Cabugao', 'District I (Poblacion)', 'District II (Poblacion)', 'District III (Poblacion)', 'Minante I', 'San Fermin', 'Tagaran', 'Turayong']
    }
  },
  'MIMAROPA Region': {
    'Oriental Mindoro': {
      'Calapan City': ['Balite', 'Bayanan I', 'Camilmil', 'Guinobatan', 'Ibaba East (Poblacion)', 'Ilaya (Poblacion)', 'Lalud', 'Lumangbayan', 'Masipit', 'Pachoca', 'San Vicente Central (Poblacion)', 'Santa Isabel', 'Santo Niño', 'Suqui', 'Tawiran']
    },
    'Palawan': {
      'Puerto Princesa City': ['Bancao-Bancao', 'Barangay ng mga Mangingisda', 'Irawan', 'Liwanag (Poblacion)', 'Mabuhay (Poblacion)', 'Mandaragat', 'Matahimik', 'Milagrosa (Poblacion)', 'Model (Poblacion)', 'San Jose', 'San Manuel', 'San Miguel', 'San Pedro', 'Santa Monica', 'Sicsican', 'Tiniguiban']
    }
  },
  'Region V - Bicol Region': {
    'Albay': {
      'Legazpi City': ['Bagumbayan', 'Bitano', 'Bonot', 'Cabangan', 'Cruzada', 'Em\'s Barrio', 'Gogon', 'Ilawod', 'Imperial Court Subd.', 'Lapu-Lapu', 'Oro Site', 'Puro', 'Rawis', 'Sagpon', 'Taysan']
    },
    'Camarines Sur': {
      'Naga City': ['Abella', 'Bagumbayan Norte', 'Balatas', 'Calauag', 'Cararayan', 'Carolina', 'Concepcion Grande', 'Concepcion Pequeña', 'Dayangdang', 'Del Rosario', 'Dinaga', 'Igualdad Interior', 'Lerma', 'Liboton', 'Mabolo', 'Pacol', 'Penafrancia', 'Sabang', 'San Felipe', 'San Francisco (Poblacion)', 'San Isidro', 'Santa Cruz', 'Tabuco', 'Tinago', 'Triangulo']
    }
  },
  'Region VI - Western Visayas': {
    'Iloilo': {
      'Iloilo City': ['Arevalo', 'Bolilao', 'Calaparan', 'City Proper', 'Cuartero', 'Dungon A', 'Jaro', 'La Paz', 'Lapuz', 'Mandurriao', 'Molo', 'San Rafael', 'Tabuc Suba', 'Tagbak']
    },
    'Negros Occidental': {
      'Bacolod City': ['Alijis', 'Banago', 'Barangay 1 (Poblacion)', 'Bata', 'Estefania', 'Granada', 'Mandalagan', 'Mansilingan', 'Pahanocoy', 'Singcang-Airport', 'Sum-ag', 'Taculing', 'Tangub', 'Villamonte']
    }
  },
  'Region VII - Central Visayas': {
    'Cebu': {
      'Cebu City': ['Apas', 'Banilad', 'Basak San Nicolas', 'Capitol Site', 'Guadalupe', 'IT Park / Lahug', 'Kamputhaw', 'Kasambagan', 'Labangon', 'Mabolo', 'Pardo', 'Punta Princesa', 'Sambag I', 'Talamban', 'Tisa'],
      'Mandaue City': ['Alang-alang', 'Bakilid', 'Banilad', 'Basak', 'Cabancalan', 'Centro (Poblacion)', 'Guizo', 'Ibabao-Estancia', 'Jagobiao', 'Maguikay', 'Mantuyong', 'Pakna-an', 'Subangdaku', 'Tipolo', 'Umapad'],
      'Lapu-Lapu City': ['Agus', 'Babag', 'Bankal', 'Basak', 'Buaya', 'Canjulao', 'Gun-ob', 'Ibo', 'Looc', 'Mactan', 'Maribago', 'Marigondon', 'Pajac', 'Pajo', 'Poblacion', 'Pusok', 'Punta Engaño']
    }
  },
  'Region VIII - Eastern Visayas': {
    'Leyte': {
      'Tacloban City': ['Abucay', 'Apitong', 'Barangay 1 (Poblacion)', 'Caibaan', 'Marasbaras', 'rank / Downtown', 'Sagkahan', 'San Jose', 'Utap', 'V&G Subdivision']
    }
  },
  'Region IX - Zamboanga Peninsula': {
    'Zamboanga del Sur': {
      'Zamboanga City': ['Ayala', 'Baliwasan', 'Boalan', 'Canelar', 'Divisoria', 'Guiwan', 'Mercedes', 'Pasonanca', 'Putik', 'San Jose Cawa-cawa', 'San Roque', 'Santa Maria', 'Tetuan', 'Tumaga', 'Zone I (Poblacion)']
    }
  },
  'Region X - Northern Mindanao': {
    'Misamis Oriental': {
      'Cagayan de Oro City': ['Agusan', 'Balulang', 'Barangay 1 (Poblacion)', 'Bugo', 'Bulua', 'Camaman-an', 'Carmen', 'Consolacion', 'Cugman', 'Gusa', 'Iponan', 'Kauswagan', 'Lapasan', 'Lumbia', 'Macabalan', 'Macasandig', 'Nazareth', 'Patag', 'Puerto', 'Puntod']
    }
  },
  'Region XI - Davao Region': {
    'Davao del Sur': {
      'Davao City': ['Agdao', 'Bago Aplaya', 'Bajada', 'Bangkal', 'Buhangin', 'Bunawan', 'Cabantian', 'Catalunan Grande', 'Catalunan Pequeño', 'Ecoland / Bucana', 'Lanang', 'Maa', 'Matina Aplaya', 'Matina Crossing', 'Mintal', 'Panacan', 'Poblacion', 'Sasa', 'Talomo', 'Toril']
    }
  },
  'Region XII - SOCCSKSARGEN': {
    'South Cotabato': {
      'General Santos City': ['Apopong', 'Baluan', 'Bula', 'Calumpang', 'City Heights', 'Dadiangas East (Poblacion)', 'Dadiangas North', 'Dadiangas South', 'Dadiangas West', 'Fatima', 'Katangawan', 'Labangal', 'Lagao', 'Mabuhay', 'San Isidro', 'Tambler']
    }
  },
  'Region XIII - Caraga': {
    'Agusan del Norte': {
      'Butuan City': ['Ambago', 'Ampayon', 'Baan KM 3', 'Bading', 'Bancasi', 'Banza', 'Buhangin', 'Doongan', 'Golden Ribbon', 'Imadejas', 'Libertad', 'Limaha', 'Lumbocan', 'Sikatuna (Poblacion)', 'Villa Kananga']
    }
  },
  'BARMM - Bangsamoro Autonomous Region': {
    'Maguindanao del Norte': {
      'Cotabato City': ['Bagua I', 'Kalanganan I', 'Poblacion I', 'Rosary Heights I', 'Rosary Heights II', 'Rosary Heights III', 'Tamontaka I']
    }
  }
};

export const getRegions = () => Object.keys(PH_ADDRESS_DATA);

export const getProvinces = (region) => {
  if (!region || !PH_ADDRESS_DATA[region]) return [];
  return Object.keys(PH_ADDRESS_DATA[region]);
};

export const getCities = (region, province) => {
  if (!region || !province || !PH_ADDRESS_DATA[region]?.[province]) return [];
  return Object.keys(PH_ADDRESS_DATA[region][province]);
};

export const getBarangays = (region, province, city) => {
  if (!region || !province || !city || !PH_ADDRESS_DATA[region]?.[province]?.[city]) return [];
  return PH_ADDRESS_DATA[region][province][city];
};

export const isValidPhAddressSelection = ({ region, province, city, barangay }) => {
  const cleanRegion = String(region || '').trim();
  const cleanProvince = String(province || '').trim();
  const cleanCity = String(city || '').trim();
  const cleanBarangay = String(barangay || '').trim();
  if (!cleanRegion || !cleanProvince || !cleanCity || !cleanBarangay) return false;
  const brgys = getBarangays(cleanRegion, cleanProvince, cleanCity);
  return brgys.includes(cleanBarangay);
};

export const formatPhAddress = ({ region, province, city, barangay }) =>
  [barangay, city, province, region].map((part) => String(part || '').trim()).filter(Boolean).join(', ');

export const parsePhAddress = (addressString) => {
  const raw = String(addressString || '').trim();
  if (!raw) return { region: '', province: '', city: '', barangay: '' };
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 4) {
    const region = parts[parts.length - 1];
    const province = parts[parts.length - 2];
    const city = parts[parts.length - 3];
    const barangay = parts.slice(0, parts.length - 3).join(', ');
    if (isValidPhAddressSelection({ region, province, city, barangay })) {
      return { region, province, city, barangay };
    }
  }
  return { region: '', province: '', city: '', barangay: '' };
};
