-- Run this entire file in the Fur Disclosure Supabase SQL editor.
-- Includes the rerunnable breed catalog, so it works whether 010 was already applied.

-- Fur Disclosure breed catalog. Run after 001_owner_profiles.sql.
-- Safe to rerun. Only fd_ objects are changed; existing breed text/history is preserved.
-- Generated from supabase/data/breeds.json by scripts/build-breeds.mjs.
begin;
create table if not exists public.fd_breeds (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null unique,
  kind text not null check (kind in ('breed','mix','unspecified')),
  aliases text[] not null default '{}',
  source_url text,
  sort_order integer not null default 100,
  active boolean not null default true
);
insert into public.fd_breeds(id,name,kind,aliases,source_url,sort_order) values
('unknown','Unknown','unspecified',array['','Unkown','Not sure','Unsure','Unknown breed']::text[],null,0),
('mixed-breed','Mixed breed','unspecified',array['Mixed','Mix','Mutt']::text[],null,1),
('aussiedoodle','Aussiedoodle','mix',array['Aussie Doodle']::text[],null,50),
('australian-labradoodle','Australian Labradoodle','mix',array[]::text[],null,50),
('bernedoodle','Bernedoodle','mix',array['Berne Doodle']::text[],null,50),
('bordoodle','Bordoodle','mix',array[]::text[],null,50),
('cavapoo','Cavapoo','mix',array['Cavoodle']::text[],null,50),
('cockapoo','Cockapoo','mix',array['Cockerpoo']::text[],null,50),
('doodle-mix','Doodle mix','mix',array['Doodle']::text[],null,50),
('double-doodle','Double Doodle','mix',array[]::text[],null,50),
('goldendoodle','Goldendoodle','mix',array['Golden Doodle']::text[],null,50),
('havapoo','Havapoo','mix',array['Havadoodle']::text[],null,50),
('labradoodle','Labradoodle','mix',array['Labra Doodle']::text[],null,50),
('maltipoo','Maltipoo','mix',array['Malti-poo']::text[],null,50),
('peekapoo','Peekapoo','mix',array[]::text[],null,50),
('pomapoo','Pomapoo','mix',array[]::text[],null,50),
('poodle','Poodle','unspecified',array['Poodle (size unknown)']::text[],null,50),
('schnauzer','Schnauzer','unspecified',array['Schnauzer (size unknown)']::text[],null,50),
('schnoodle','Schnoodle','mix',array[]::text[],null,50),
('sheepadoodle','Sheepadoodle','mix',array['Sheepa Doodle']::text[],null,50),
('shih-poo','Shih-poo','mix',array['Shihpoo','Shih Poo']::text[],null,50),
('yorkipoo','Yorkipoo','mix',array['Yorkiepoo','Yorkie Poo']::text[],null,50),
('affenpinscher','Affenpinscher','breed',array[]::text[],'https://www.akc.org/dog-breeds/affenpinscher/',100),
('afghan-hound','Afghan Hound','breed',array[]::text[],'https://www.akc.org/dog-breeds/afghan-hound/',100),
('airedale-terrier','Airedale Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/airedale-terrier/',100),
('akita','Akita','breed',array[]::text[],'https://www.akc.org/dog-breeds/akita/',100),
('alaskan-klee-kai','Alaskan Klee Kai','breed',array[]::text[],'https://www.akc.org/dog-breeds/alaskan-klee-kai/',100),
('alaskan-malamute','Alaskan Malamute','breed',array[]::text[],'https://www.akc.org/dog-breeds/alaskan-malamute/',100),
('american-bulldog','American Bulldog','breed',array[]::text[],'https://www.akc.org/dog-breeds/american-bulldog/',100),
('american-english-coonhound','American English Coonhound','breed',array[]::text[],'https://www.akc.org/dog-breeds/american-english-coonhound/',100),
('american-eskimo-dog','American Eskimo Dog','breed',array[]::text[],'https://www.akc.org/dog-breeds/american-eskimo-dog/',100),
('american-foxhound','American Foxhound','breed',array[]::text[],'https://www.akc.org/dog-breeds/american-foxhound/',100),
('american-hairless-terrier','American Hairless Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/american-hairless-terrier/',100),
('american-leopard-hound','American Leopard Hound','breed',array[]::text[],'https://www.akc.org/dog-breeds/american-leopard-hound/',100),
('american-staffordshire-terrier','American Staffordshire Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/american-staffordshire-terrier/',100),
('american-water-spaniel','American Water Spaniel','breed',array[]::text[],'https://www.akc.org/dog-breeds/american-water-spaniel/',100),
('anatolian-shepherd-dog','Anatolian Shepherd Dog','breed',array[]::text[],'https://www.akc.org/dog-breeds/anatolian-shepherd-dog/',100),
('appenzeller-sennenhund','Appenzeller Sennenhund','breed',array[]::text[],'https://www.akc.org/dog-breeds/appenzeller-sennenhund/',100),
('australian-cattle-dog','Australian Cattle Dog','breed',array[]::text[],'https://www.akc.org/dog-breeds/australian-cattle-dog/',100),
('australian-kelpie','Australian Kelpie','breed',array[]::text[],'https://www.akc.org/dog-breeds/australian-kelpie/',100),
('australian-shepherd','Australian Shepherd','breed',array[]::text[],'https://www.akc.org/dog-breeds/australian-shepherd/',100),
('australian-stumpy-tail-cattle-dog','Australian Stumpy Tail Cattle Dog','breed',array[]::text[],'https://www.akc.org/dog-breeds/australian-stumpy-tail-cattle-dog/',100),
('australian-terrier','Australian Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/australian-terrier/',100),
('azawakh','Azawakh','breed',array[]::text[],'https://www.akc.org/dog-breeds/azawakh/',100),
('barbado-da-terceira','Barbado da Terceira','breed',array[]::text[],'https://www.akc.org/dog-breeds/barbado-da-terceira/',100),
('barbet','Barbet','breed',array[]::text[],'https://www.akc.org/dog-breeds/barbet/',100),
('basenji','Basenji','breed',array[]::text[],'https://www.akc.org/dog-breeds/basenji/',100),
('basset-fauve-de-bretagne','Basset Fauve de Bretagne','breed',array[]::text[],'https://www.akc.org/dog-breeds/basset-fauve-de-bretagne/',100),
('basset-hound','Basset Hound','breed',array[]::text[],'https://www.akc.org/dog-breeds/basset-hound/',100),
('bavarian-mountain-scent-hound','Bavarian Mountain Scent Hound','breed',array[]::text[],'https://www.akc.org/dog-breeds/bavarian-mountain-scent-hound/',100),
('beagle','Beagle','breed',array[]::text[],'https://www.akc.org/dog-breeds/beagle/',100),
('bearded-collie','Bearded Collie','breed',array[]::text[],'https://www.akc.org/dog-breeds/bearded-collie/',100),
('beauceron','Beauceron','breed',array[]::text[],'https://www.akc.org/dog-breeds/beauceron/',100),
('bedlington-terrier','Bedlington Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/bedlington-terrier/',100),
('belgian-laekenois','Belgian Laekenois','breed',array[]::text[],'https://www.akc.org/dog-breeds/belgian-laekenois/',100),
('belgian-malinois','Belgian Malinois','breed',array[]::text[],'https://www.akc.org/dog-breeds/belgian-malinois/',100),
('belgian-sheepdog','Belgian Sheepdog','breed',array[]::text[],'https://www.akc.org/dog-breeds/belgian-sheepdog/',100),
('belgian-tervuren','Belgian Tervuren','breed',array[]::text[],'https://www.akc.org/dog-breeds/belgian-tervuren/',100),
('bergamasco-sheepdog','Bergamasco Sheepdog','breed',array[]::text[],'https://www.akc.org/dog-breeds/bergamasco-sheepdog/',100),
('berger-picard','Berger Picard','breed',array[]::text[],'https://www.akc.org/dog-breeds/berger-picard/',100),
('bernese-mountain-dog','Bernese Mountain Dog','breed',array[]::text[],'https://www.akc.org/dog-breeds/bernese-mountain-dog/',100),
('bichon-frise','Bichon Frise','breed',array['Bichon Frisé','Bichon']::text[],'https://www.akc.org/dog-breeds/bichon-frise/',100),
('biewer-terrier','Biewer Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/biewer-terrier/',100),
('black-and-tan-coonhound','Black and Tan Coonhound','breed',array[]::text[],'https://www.akc.org/dog-breeds/black-and-tan-coonhound/',100),
('black-russian-terrier','Black Russian Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/black-russian-terrier/',100),
('bloodhound','Bloodhound','breed',array[]::text[],'https://www.akc.org/dog-breeds/bloodhound/',100),
('blue-picardy-spaniel','Blue Picardy Spaniel','breed',array[]::text[],'https://www.akc.org/dog-breeds/blue-picardy-spaniel/',100),
('bluetick-coonhound','Bluetick Coonhound','breed',array[]::text[],'https://www.akc.org/dog-breeds/bluetick-coonhound/',100),
('boerboel','Boerboel','breed',array[]::text[],'https://www.akc.org/dog-breeds/boerboel/',100),
('bohemian-shepherd','Bohemian Shepherd','breed',array[]::text[],'https://www.akc.org/dog-breeds/bohemian-shepherd/',100),
('bolognese','Bolognese','breed',array[]::text[],'https://www.akc.org/dog-breeds/bolognese/',100),
('border-collie','Border Collie','breed',array[]::text[],'https://www.akc.org/dog-breeds/border-collie/',100),
('border-terrier','Border Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/border-terrier/',100),
('borzoi','Borzoi','breed',array[]::text[],'https://www.akc.org/dog-breeds/borzoi/',100),
('boston-terrier','Boston Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/boston-terrier/',100),
('bouvier-de-ardennes','Bouvier des Ardennes','breed',array[]::text[],'https://www.akc.org/dog-breeds/bouvier-de-ardennes/',100),
('bouvier-des-flandres','Bouvier des Flandres','breed',array[]::text[],'https://www.akc.org/dog-breeds/bouvier-des-flandres/',100),
('boxer','Boxer','breed',array[]::text[],'https://www.akc.org/dog-breeds/boxer/',100),
('boykin-spaniel','Boykin Spaniel','breed',array[]::text[],'https://www.akc.org/dog-breeds/boykin-spaniel/',100),
('bracco-italiano','Bracco Italiano','breed',array[]::text[],'https://www.akc.org/dog-breeds/bracco-italiano/',100),
('braque-du-bourbonnais','Braque du Bourbonnais','breed',array[]::text[],'https://www.akc.org/dog-breeds/braque-du-bourbonnais/',100),
('braque-francais-pyrenean','Braque Francais Pyrenean','breed',array[]::text[],'https://www.akc.org/dog-breeds/braque-francais-pyrenean/',100),
('braque-saint-germain','Braque Saint-Germain','breed',array[]::text[],'https://www.akc.org/dog-breeds/braque-saint-germain/',100),
('brazilian-terrier','Brazilian Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/brazilian-terrier/',100),
('briard','Briard','breed',array[]::text[],'https://www.akc.org/dog-breeds/briard/',100),
('brittany','Brittany','breed',array[]::text[],'https://www.akc.org/dog-breeds/brittany/',100),
('broholmer','Broholmer','breed',array[]::text[],'https://www.akc.org/dog-breeds/broholmer/',100),
('brussels-griffon','Brussels Griffon','breed',array[]::text[],'https://www.akc.org/dog-breeds/brussels-griffon/',100),
('bull-terrier','Bull Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/bull-terrier/',100),
('bulldog','Bulldog','breed',array[]::text[],'https://www.akc.org/dog-breeds/bulldog/',100),
('bullmastiff','Bullmastiff','breed',array[]::text[],'https://www.akc.org/dog-breeds/bullmastiff/',100),
('cairn-terrier','Cairn Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/cairn-terrier/',100),
('calupoh','Calupoh','breed',array[]::text[],'https://www.akc.org/dog-breeds/calupoh/',100),
('canaan-dog','Canaan Dog','breed',array[]::text[],'https://www.akc.org/dog-breeds/canaan-dog/',100),
('canadian-eskimo-dog','Canadian Eskimo Dog','breed',array[]::text[],'https://www.akc.org/dog-breeds/canadian-eskimo-dog/',100),
('cane-corso','Cane Corso','breed',array[]::text[],'https://www.akc.org/dog-breeds/cane-corso/',100),
('cardigan-welsh-corgi','Cardigan Welsh Corgi','breed',array[]::text[],'https://www.akc.org/dog-breeds/cardigan-welsh-corgi/',100),
('carolina-dog','Carolina Dog','breed',array[]::text[],'https://www.akc.org/dog-breeds/carolina-dog/',100),
('catahoula-leopard-dog','Catahoula Leopard Dog','breed',array[]::text[],'https://www.akc.org/dog-breeds/catahoula-leopard-dog/',100),
('caucasian-shepherd-dog','Caucasian Shepherd Dog','breed',array[]::text[],'https://www.akc.org/dog-breeds/caucasian-shepherd-dog/',100),
('cavalier-king-charles-spaniel','Cavalier King Charles Spaniel','breed',array[]::text[],'https://www.akc.org/dog-breeds/cavalier-king-charles-spaniel/',100),
('central-asian-shepherd-dog','Central Asian Shepherd Dog','breed',array[]::text[],'https://www.akc.org/dog-breeds/central-asian-shepherd-dog/',100),
('cesky-terrier','Cesky Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/cesky-terrier/',100),
('chesapeake-bay-retriever','Chesapeake Bay Retriever','breed',array[]::text[],'https://www.akc.org/dog-breeds/chesapeake-bay-retriever/',100),
('chihuahua','Chihuahua','breed',array[]::text[],'https://www.akc.org/dog-breeds/chihuahua/',100),
('chinese-crested','Chinese Crested','breed',array[]::text[],'https://www.akc.org/dog-breeds/chinese-crested/',100),
('chinese-shar-pei','Chinese Shar-Pei','breed',array[]::text[],'https://www.akc.org/dog-breeds/chinese-shar-pei/',100),
('chinook','Chinook','breed',array[]::text[],'https://www.akc.org/dog-breeds/chinook/',100),
('chow-chow','Chow Chow','breed',array[]::text[],'https://www.akc.org/dog-breeds/chow-chow/',100),
('cirneco-delletna','Cirneco dell’Etna','breed',array[]::text[],'https://www.akc.org/dog-breeds/cirneco-delletna/',100),
('clumber-spaniel','Clumber Spaniel','breed',array[]::text[],'https://www.akc.org/dog-breeds/clumber-spaniel/',100),
('cocker-spaniel','Cocker Spaniel','breed',array[]::text[],'https://www.akc.org/dog-breeds/cocker-spaniel/',100),
('collie','Collie','breed',array[]::text[],'https://www.akc.org/dog-breeds/collie/',100),
('coton-de-tulear','Coton de Tulear','breed',array[]::text[],'https://www.akc.org/dog-breeds/coton-de-tulear/',100),
('croatian-sheepdog','Croatian Sheepdog','breed',array[]::text[],'https://www.akc.org/dog-breeds/croatian-sheepdog/',100),
('curly-coated-retriever','Curly-Coated Retriever','breed',array[]::text[],'https://www.akc.org/dog-breeds/curly-coated-retriever/',100),
('czechoslovakian-vlciak','Czechoslovakian Vlciak','breed',array[]::text[],'https://www.akc.org/dog-breeds/czechoslovakian-vlciak/',100),
('dachshund','Dachshund','breed',array[]::text[],'https://www.akc.org/dog-breeds/dachshund/',100),
('dalmatian','Dalmatian','breed',array[]::text[],'https://www.akc.org/dog-breeds/dalmatian/',100),
('dandie-dinmont-terrier','Dandie Dinmont Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/dandie-dinmont-terrier/',100),
('danish-swedish-farmdog','Danish-Swedish Farmdog','breed',array[]::text[],'https://www.akc.org/dog-breeds/danish-swedish-farmdog/',100),
('deutscher-wachtelhund','Deutscher Wachtelhund','breed',array[]::text[],'https://www.akc.org/dog-breeds/deutscher-wachtelhund/',100),
('doberman-pinscher','Doberman Pinscher','breed',array[]::text[],'https://www.akc.org/dog-breeds/doberman-pinscher/',100),
('dogo-argentino','Dogo Argentino','breed',array[]::text[],'https://www.akc.org/dog-breeds/dogo-argentino/',100),
('dogue-de-bordeaux','Dogue de Bordeaux','breed',array[]::text[],'https://www.akc.org/dog-breeds/dogue-de-bordeaux/',100),
('drentsche-patrijshond','Drentsche Patrijshond','breed',array[]::text[],'https://www.akc.org/dog-breeds/drentsche-patrijshond/',100),
('drever','Drever','breed',array[]::text[],'https://www.akc.org/dog-breeds/drever/',100),
('dutch-shepherd','Dutch Shepherd','breed',array[]::text[],'https://www.akc.org/dog-breeds/dutch-shepherd/',100),
('english-cocker-spaniel','English Cocker Spaniel','breed',array[]::text[],'https://www.akc.org/dog-breeds/english-cocker-spaniel/',100),
('english-foxhound','English Foxhound','breed',array[]::text[],'https://www.akc.org/dog-breeds/english-foxhound/',100),
('english-setter','English Setter','breed',array[]::text[],'https://www.akc.org/dog-breeds/english-setter/',100),
('english-springer-spaniel','English Springer Spaniel','breed',array[]::text[],'https://www.akc.org/dog-breeds/english-springer-spaniel/',100),
('english-toy-spaniel','English Toy Spaniel','breed',array[]::text[],'https://www.akc.org/dog-breeds/english-toy-spaniel/',100),
('entlebucher-mountain-dog','Entlebucher Mountain Dog','breed',array[]::text[],'https://www.akc.org/dog-breeds/entlebucher-mountain-dog/',100),
('estrela-mountain-dog','Estrela Mountain Dog','breed',array[]::text[],'https://www.akc.org/dog-breeds/estrela-mountain-dog/',100),
('eurasier','Eurasier','breed',array[]::text[],'https://www.akc.org/dog-breeds/eurasier/',100),
('field-spaniel','Field Spaniel','breed',array[]::text[],'https://www.akc.org/dog-breeds/field-spaniel/',100),
('finnish-lapphund','Finnish Lapphund','breed',array[]::text[],'https://www.akc.org/dog-breeds/finnish-lapphund/',100),
('finnish-spitz','Finnish Spitz','breed',array[]::text[],'https://www.akc.org/dog-breeds/finnish-spitz/',100),
('flat-coated-retriever','Flat-Coated Retriever','breed',array[]::text[],'https://www.akc.org/dog-breeds/flat-coated-retriever/',100),
('french-bulldog','French Bulldog','breed',array[]::text[],'https://www.akc.org/dog-breeds/french-bulldog/',100),
('french-spaniel','French Spaniel','breed',array[]::text[],'https://www.akc.org/dog-breeds/french-spaniel/',100),
('german-longhaired-pointer','German Longhaired Pointer','breed',array[]::text[],'https://www.akc.org/dog-breeds/german-longhaired-pointer/',100),
('german-pinscher','German Pinscher','breed',array[]::text[],'https://www.akc.org/dog-breeds/german-pinscher/',100),
('german-shepherd-dog','German Shepherd Dog','breed',array['German Shepherd','GSD']::text[],'https://www.akc.org/dog-breeds/german-shepherd-dog/',100),
('german-shorthaired-pointer','German Shorthaired Pointer','breed',array[]::text[],'https://www.akc.org/dog-breeds/german-shorthaired-pointer/',100),
('german-spitz','German Spitz','breed',array[]::text[],'https://www.akc.org/dog-breeds/german-spitz/',100),
('german-wirehaired-pointer','German Wirehaired Pointer','breed',array[]::text[],'https://www.akc.org/dog-breeds/german-wirehaired-pointer/',100),
('giant-schnauzer','Giant Schnauzer','breed',array[]::text[],'https://www.akc.org/dog-breeds/giant-schnauzer/',100),
('glen-of-imaal-terrier','Glen of Imaal Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/glen-of-imaal-terrier/',100),
('golden-retriever','Golden Retriever','breed',array[]::text[],'https://www.akc.org/dog-breeds/golden-retriever/',100),
('gordon-setter','Gordon Setter','breed',array[]::text[],'https://www.akc.org/dog-breeds/gordon-setter/',100),
('grand-basset-griffon-vendeen','Grand Basset Griffon Vendéen','breed',array[]::text[],'https://www.akc.org/dog-breeds/grand-basset-griffon-vendeen/',100),
('great-dane','Great Dane','breed',array[]::text[],'https://www.akc.org/dog-breeds/great-dane/',100),
('great-pyrenees','Great Pyrenees','breed',array[]::text[],'https://www.akc.org/dog-breeds/great-pyrenees/',100),
('greater-swiss-mountain-dog','Greater Swiss Mountain Dog','breed',array[]::text[],'https://www.akc.org/dog-breeds/greater-swiss-mountain-dog/',100),
('greyhound','Greyhound','breed',array[]::text[],'https://www.akc.org/dog-breeds/greyhound/',100),
('hamiltonstovare','Hamiltonstovare','breed',array[]::text[],'https://www.akc.org/dog-breeds/hamiltonstovare/',100),
('hanoverian-scenthound','Hanoverian Scenthound','breed',array[]::text[],'https://www.akc.org/dog-breeds/hanoverian-scenthound/',100),
('harrier','Harrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/harrier/',100),
('havanese','Havanese','breed',array[]::text[],'https://www.akc.org/dog-breeds/havanese/',100),
('hokkaido','Hokkaido','breed',array[]::text[],'https://www.akc.org/dog-breeds/hokkaido/',100),
('hovawart','Hovawart','breed',array[]::text[],'https://www.akc.org/dog-breeds/hovawart/',100),
('ibizan-hound','Ibizan Hound','breed',array[]::text[],'https://www.akc.org/dog-breeds/ibizan-hound/',100),
('icelandic-sheepdog','Icelandic Sheepdog','breed',array[]::text[],'https://www.akc.org/dog-breeds/icelandic-sheepdog/',100),
('irish-red-and-white-setter','Irish Red and White Setter','breed',array[]::text[],'https://www.akc.org/dog-breeds/irish-red-and-white-setter/',100),
('irish-setter','Irish Setter','breed',array[]::text[],'https://www.akc.org/dog-breeds/irish-setter/',100),
('irish-terrier','Irish Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/irish-terrier/',100),
('irish-water-spaniel','Irish Water Spaniel','breed',array[]::text[],'https://www.akc.org/dog-breeds/irish-water-spaniel/',100),
('irish-wolfhound','Irish Wolfhound','breed',array[]::text[],'https://www.akc.org/dog-breeds/irish-wolfhound/',100),
('italian-greyhound','Italian Greyhound','breed',array[]::text[],'https://www.akc.org/dog-breeds/italian-greyhound/',100),
('jagdterrier','Jagdterrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/jagdterrier/',100),
('japanese-akitainu','Japanese Akitainu','breed',array[]::text[],'https://www.akc.org/dog-breeds/japanese-akitainu/',100),
('japanese-chin','Japanese Chin','breed',array[]::text[],'https://www.akc.org/dog-breeds/japanese-chin/',100),
('japanese-spitz','Japanese Spitz','breed',array[]::text[],'https://www.akc.org/dog-breeds/japanese-spitz/',100),
('japanese-terrier','Japanese Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/japanese-terrier/',100),
('kai-ken','Kai Ken','breed',array[]::text[],'https://www.akc.org/dog-breeds/kai-ken/',100),
('karelian-bear-dog','Karelian Bear Dog','breed',array[]::text[],'https://www.akc.org/dog-breeds/karelian-bear-dog/',100),
('keeshond','Keeshond','breed',array[]::text[],'https://www.akc.org/dog-breeds/keeshond/',100),
('kerry-blue-terrier','Kerry Blue Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/kerry-blue-terrier/',100),
('kishu-ken','Kishu Ken','breed',array[]::text[],'https://www.akc.org/dog-breeds/kishu-ken/',100),
('komondor','Komondor','breed',array[]::text[],'https://www.akc.org/dog-breeds/komondor/',100),
('korean-jindo-dog','Korean Jindo Dog','breed',array[]::text[],'https://www.akc.org/dog-breeds/korean-jindo-dog/',100),
('kromfohrlander','Kromfohrlander','breed',array[]::text[],'https://www.akc.org/dog-breeds/kromfohrlander/',100),
('kuvasz','Kuvasz','breed',array[]::text[],'https://www.akc.org/dog-breeds/kuvasz/',100),
('labrador-retriever','Labrador Retriever','breed',array['Lab','Labrador']::text[],'https://www.akc.org/dog-breeds/labrador-retriever/',100),
('lagotto-romagnolo','Lagotto Romagnolo','breed',array[]::text[],'https://www.akc.org/dog-breeds/lagotto-romagnolo/',100),
('lakeland-terrier','Lakeland Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/lakeland-terrier/',100),
('lancashire-heeler','Lancashire Heeler','breed',array[]::text[],'https://www.akc.org/dog-breeds/lancashire-heeler/',100),
('lapponian-herder','Lapponian Herder','breed',array[]::text[],'https://www.akc.org/dog-breeds/lapponian-herder/',100),
('large-munsterlander','Large Munsterlander','breed',array[]::text[],'https://www.akc.org/dog-breeds/large-munsterlander/',100),
('leonberger','Leonberger','breed',array[]::text[],'https://www.akc.org/dog-breeds/leonberger/',100),
('lhasa-apso','Lhasa Apso','breed',array[]::text[],'https://www.akc.org/dog-breeds/lhasa-apso/',100),
('lowchen','Löwchen','breed',array[]::text[],'https://www.akc.org/dog-breeds/lowchen/',100),
('lucas-terrier','Lucas Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/lucas-terrier/',100),
('maltese','Maltese','breed',array[]::text[],'https://www.akc.org/dog-breeds/maltese/',100),
('manchester-terrier-standard','Manchester Terrier (Standard)','breed',array[]::text[],'https://www.akc.org/dog-breeds/manchester-terrier-standard/',100),
('manchester-terrier-toy','Manchester Terrier (Toy)','breed',array[]::text[],'https://www.akc.org/dog-breeds/manchester-terrier-toy/',100),
('mastiff','Mastiff','breed',array[]::text[],'https://www.akc.org/dog-breeds/mastiff/',100),
('miniature-american-shepherd','Miniature American Shepherd','breed',array[]::text[],'https://www.akc.org/dog-breeds/miniature-american-shepherd/',100),
('miniature-bull-terrier','Miniature Bull Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/miniature-bull-terrier/',100),
('miniature-pinscher','Miniature Pinscher','breed',array[]::text[],'https://www.akc.org/dog-breeds/miniature-pinscher/',100),
('miniature-schnauzer','Miniature Schnauzer','breed',array[]::text[],'https://www.akc.org/dog-breeds/miniature-schnauzer/',100),
('mountain-cur','Mountain Cur','breed',array[]::text[],'https://www.akc.org/dog-breeds/mountain-cur/',100),
('mudi','Mudi','breed',array[]::text[],'https://www.akc.org/dog-breeds/mudi/',100),
('neapolitan-mastiff','Neapolitan Mastiff','breed',array[]::text[],'https://www.akc.org/dog-breeds/neapolitan-mastiff/',100),
('nederlandse-kooikerhondje','Nederlandse Kooikerhondje','breed',array[]::text[],'https://www.akc.org/dog-breeds/nederlandse-kooikerhondje/',100),
('nenets-laika','Nenets Laika','breed',array[]::text[],'https://www.akc.org/dog-breeds/nenets-laika/',100),
('newfoundland','Newfoundland','breed',array[]::text[],'https://www.akc.org/dog-breeds/newfoundland/',100),
('norfolk-terrier','Norfolk Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/norfolk-terrier/',100),
('norrbottenspets','Norrbottenspets','breed',array[]::text[],'https://www.akc.org/dog-breeds/norrbottenspets/',100),
('norwegian-buhund','Norwegian Buhund','breed',array[]::text[],'https://www.akc.org/dog-breeds/norwegian-buhund/',100),
('norwegian-elkhound','Norwegian Elkhound','breed',array[]::text[],'https://www.akc.org/dog-breeds/norwegian-elkhound/',100),
('norwegian-lundehund','Norwegian Lundehund','breed',array[]::text[],'https://www.akc.org/dog-breeds/norwegian-lundehund/',100),
('norwich-terrier','Norwich Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/norwich-terrier/',100),
('nova-scotia-duck-tolling-retriever','Nova Scotia Duck Tolling Retriever','breed',array[]::text[],'https://www.akc.org/dog-breeds/nova-scotia-duck-tolling-retriever/',100),
('old-danish-pointer','Old Danish Pointer','breed',array[]::text[],'https://www.akc.org/dog-breeds/old-danish-pointer/',100),
('old-english-sheepdog','Old English Sheepdog','breed',array[]::text[],'https://www.akc.org/dog-breeds/old-english-sheepdog/',100),
('otterhound','Otterhound','breed',array[]::text[],'https://www.akc.org/dog-breeds/otterhound/',100),
('papillon','Papillon','breed',array[]::text[],'https://www.akc.org/dog-breeds/papillon/',100),
('parson-russell-terrier','Parson Russell Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/parson-russell-terrier/',100),
('pekingese','Pekingese','breed',array[]::text[],'https://www.akc.org/dog-breeds/pekingese/',100),
('pembroke-welsh-corgi','Pembroke Welsh Corgi','breed',array[]::text[],'https://www.akc.org/dog-breeds/pembroke-welsh-corgi/',100),
('peruvian-inca-orchid','Peruvian Inca Orchid','breed',array[]::text[],'https://www.akc.org/dog-breeds/peruvian-inca-orchid/',100),
('petit-basset-griffon-vendeen','Petit Basset Griffon Vendéen','breed',array[]::text[],'https://www.akc.org/dog-breeds/petit-basset-griffon-vendeen/',100),
('pharaoh-hound','Pharaoh Hound','breed',array[]::text[],'https://www.akc.org/dog-breeds/pharaoh-hound/',100),
('plott-hound','Plott Hound','breed',array[]::text[],'https://www.akc.org/dog-breeds/plott-hound/',100),
('pointer','Pointer','breed',array[]::text[],'https://www.akc.org/dog-breeds/pointer/',100),
('polish-lowland-sheepdog','Polish Lowland Sheepdog','breed',array[]::text[],'https://www.akc.org/dog-breeds/polish-lowland-sheepdog/',100),
('pomeranian','Pomeranian','breed',array[]::text[],'https://www.akc.org/dog-breeds/pomeranian/',100),
('pont-audemer-spaniel','Pont-Audemer Spaniel','breed',array[]::text[],'https://www.akc.org/dog-breeds/pont-audemer-spaniel/',100),
('poodle-miniature','Poodle (Miniature)','breed',array['Miniature Poodle','Mini Poodle']::text[],'https://www.akc.org/dog-breeds/poodle-miniature/',100),
('poodle-standard','Poodle (Standard)','breed',array['Standard Poodle']::text[],'https://www.akc.org/dog-breeds/poodle-standard/',100),
('poodle-toy','Poodle (Toy)','breed',array['Toy Poodle']::text[],'https://www.akc.org/dog-breeds/poodle-toy/',100),
('porcelaine','Porcelaine','breed',array[]::text[],'https://www.akc.org/dog-breeds/porcelaine/',100),
('portuguese-podengo','Portuguese Podengo','breed',array[]::text[],'https://www.akc.org/dog-breeds/portuguese-podengo/',100),
('portuguese-podengo-pequeno','Portuguese Podengo Pequeno','breed',array[]::text[],'https://www.akc.org/dog-breeds/portuguese-podengo-pequeno/',100),
('portuguese-pointer','Portuguese Pointer','breed',array[]::text[],'https://www.akc.org/dog-breeds/portuguese-pointer/',100),
('portuguese-sheepdog','Portuguese Sheepdog','breed',array[]::text[],'https://www.akc.org/dog-breeds/portuguese-sheepdog/',100),
('portuguese-water-dog','Portuguese Water Dog','breed',array[]::text[],'https://www.akc.org/dog-breeds/portuguese-water-dog/',100),
('presa-canario','Presa Canario','breed',array[]::text[],'https://www.akc.org/dog-breeds/presa-canario/',100),
('pudelpointer','Pudelpointer','breed',array[]::text[],'https://www.akc.org/dog-breeds/pudelpointer/',100),
('pug','Pug','breed',array[]::text[],'https://www.akc.org/dog-breeds/pug/',100),
('puli','Puli','breed',array[]::text[],'https://www.akc.org/dog-breeds/puli/',100),
('pumi','Pumi','breed',array[]::text[],'https://www.akc.org/dog-breeds/pumi/',100),
('pyrenean-mastiff','Pyrenean Mastiff','breed',array[]::text[],'https://www.akc.org/dog-breeds/pyrenean-mastiff/',100),
('pyrenean-shepherd','Pyrenean Shepherd','breed',array[]::text[],'https://www.akc.org/dog-breeds/pyrenean-shepherd/',100),
('rafeiro-do-alentejo','Rafeiro do Alentejo','breed',array[]::text[],'https://www.akc.org/dog-breeds/rafeiro-do-alentejo/',100),
('rat-terrier','Rat Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/rat-terrier/',100),
('redbone-coonhound','Redbone Coonhound','breed',array[]::text[],'https://www.akc.org/dog-breeds/redbone-coonhound/',100),
('rhodesian-ridgeback','Rhodesian Ridgeback','breed',array[]::text[],'https://www.akc.org/dog-breeds/rhodesian-ridgeback/',100),
('romanian-carpathian-shepherd','Romanian Carpathian Shepherd','breed',array[]::text[],'https://www.akc.org/dog-breeds/romanian-carpathian-shepherd/',100),
('romanian-mioritic-shepherd-dog','Romanian Mioritic Shepherd Dog','breed',array[]::text[],'https://www.akc.org/dog-breeds/romanian-mioritic-shepherd-dog/',100),
('rottweiler','Rottweiler','breed',array[]::text[],'https://www.akc.org/dog-breeds/rottweiler/',100),
('russell-terrier','Russell Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/russell-terrier/',100),
('russian-toy','Russian Toy','breed',array[]::text[],'https://www.akc.org/dog-breeds/russian-toy/',100),
('russian-tsvetnaya-bolonka','Russian Tsvetnaya Bolonka','breed',array[]::text[],'https://www.akc.org/dog-breeds/russian-tsvetnaya-bolonka/',100),
('saarloos-wolfhond','Saarloos Wolfhond','breed',array[]::text[],'https://www.akc.org/dog-breeds/saarloos-wolfhond/',100),
('st-bernard','Saint Bernard','breed',array[]::text[],'https://www.akc.org/dog-breeds/st-bernard/',100),
('saluki','Saluki','breed',array[]::text[],'https://www.akc.org/dog-breeds/saluki/',100),
('samoyed','Samoyed','breed',array[]::text[],'https://www.akc.org/dog-breeds/samoyed/',100),
('schapendoes','Schapendoes','breed',array[]::text[],'https://www.akc.org/dog-breeds/schapendoes/',100),
('schipperke','Schipperke','breed',array[]::text[],'https://www.akc.org/dog-breeds/schipperke/',100),
('scottish-deerhound','Scottish Deerhound','breed',array[]::text[],'https://www.akc.org/dog-breeds/scottish-deerhound/',100),
('scottish-terrier','Scottish Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/scottish-terrier/',100),
('sealyham-terrier','Sealyham Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/sealyham-terrier/',100),
('segugio-italiano','Segugio Italiano','breed',array[]::text[],'https://www.akc.org/dog-breeds/segugio-italiano/',100),
('shetland-sheepdog','Shetland Sheepdog','breed',array[]::text[],'https://www.akc.org/dog-breeds/shetland-sheepdog/',100),
('shiba-inu','Shiba Inu','breed',array[]::text[],'https://www.akc.org/dog-breeds/shiba-inu/',100),
('shih-tzu','Shih Tzu','breed',array['Shih Tsu']::text[],'https://www.akc.org/dog-breeds/shih-tzu/',100),
('shikoku-ken','Shikoku Ken','breed',array[]::text[],'https://www.akc.org/dog-breeds/shikoku-ken/',100),
('siberian-husky','Siberian Husky','breed',array[]::text[],'https://www.akc.org/dog-breeds/siberian-husky/',100),
('silken-windhound','Silken Windhound','breed',array[]::text[],'https://www.akc.org/dog-breeds/silken-windhound/',100),
('silky-terrier','Silky Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/silky-terrier/',100),
('skye-terrier','Skye Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/skye-terrier/',100),
('sloughi','Sloughi','breed',array[]::text[],'https://www.akc.org/dog-breeds/sloughi/',100),
('slovakian-wirehaired-pointer','Slovakian Wirehaired Pointer','breed',array[]::text[],'https://www.akc.org/dog-breeds/slovakian-wirehaired-pointer/',100),
('slovensky-cuvac','Slovensky Cuvac','breed',array[]::text[],'https://www.akc.org/dog-breeds/slovensky-cuvac/',100),
('slovensky-kopov','Slovensky Kopov','breed',array[]::text[],'https://www.akc.org/dog-breeds/slovensky-kopov/',100),
('small-munsterlander','Small Munsterlander','breed',array[]::text[],'https://www.akc.org/dog-breeds/small-munsterlander/',100),
('smooth-fox-terrier','Smooth Fox Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/smooth-fox-terrier/',100),
('soft-coated-wheaten-terrier','Soft Coated Wheaten Terrier','breed',array['Wheaten Terrier']::text[],'https://www.akc.org/dog-breeds/soft-coated-wheaten-terrier/',100),
('spanish-mastiff','Spanish Mastiff','breed',array[]::text[],'https://www.akc.org/dog-breeds/spanish-mastiff/',100),
('spanish-water-dog','Spanish Water Dog','breed',array[]::text[],'https://www.akc.org/dog-breeds/spanish-water-dog/',100),
('spinone-italiano','Spinone Italiano','breed',array[]::text[],'https://www.akc.org/dog-breeds/spinone-italiano/',100),
('stabyhoun','Stabyhoun','breed',array[]::text[],'https://www.akc.org/dog-breeds/stabyhoun/',100),
('staffordshire-bull-terrier','Staffordshire Bull Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/staffordshire-bull-terrier/',100),
('standard-schnauzer','Standard Schnauzer','breed',array[]::text[],'https://www.akc.org/dog-breeds/standard-schnauzer/',100),
('sussex-spaniel','Sussex Spaniel','breed',array[]::text[],'https://www.akc.org/dog-breeds/sussex-spaniel/',100),
('swedish-lapphund','Swedish Lapphund','breed',array[]::text[],'https://www.akc.org/dog-breeds/swedish-lapphund/',100),
('swedish-vallhund','Swedish Vallhund','breed',array[]::text[],'https://www.akc.org/dog-breeds/swedish-vallhund/',100),
('taiwan-dog','Taiwan Dog','breed',array[]::text[],'https://www.akc.org/dog-breeds/taiwan-dog/',100),
('teddy-roosevelt-terrier','Teddy Roosevelt Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/teddy-roosevelt-terrier/',100),
('thai-bangkaew','Thai Bangkaew','breed',array[]::text[],'https://www.akc.org/dog-breeds/thai-bangkaew/',100),
('thai-ridgeback','Thai Ridgeback','breed',array[]::text[],'https://www.akc.org/dog-breeds/thai-ridgeback/',100),
('tibetan-mastiff','Tibetan Mastiff','breed',array[]::text[],'https://www.akc.org/dog-breeds/tibetan-mastiff/',100),
('tibetan-spaniel','Tibetan Spaniel','breed',array[]::text[],'https://www.akc.org/dog-breeds/tibetan-spaniel/',100),
('tibetan-terrier','Tibetan Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/tibetan-terrier/',100),
('tornjak','Tornjak','breed',array[]::text[],'https://www.akc.org/dog-breeds/tornjak/',100),
('tosa','Tosa','breed',array[]::text[],'https://www.akc.org/dog-breeds/tosa/',100),
('toy-fox-terrier','Toy Fox Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/toy-fox-terrier/',100),
('transylvanian-hound','Transylvanian Hound','breed',array[]::text[],'https://www.akc.org/dog-breeds/transylvanian-hound/',100),
('treeing-tennessee-brindle','Treeing Tennessee Brindle','breed',array[]::text[],'https://www.akc.org/dog-breeds/treeing-tennessee-brindle/',100),
('treeing-walker-coonhound','Treeing Walker Coonhound','breed',array[]::text[],'https://www.akc.org/dog-breeds/treeing-walker-coonhound/',100),
('vizsla','Vizsla','breed',array[]::text[],'https://www.akc.org/dog-breeds/vizsla/',100),
('volpino-italiano','Volpino Italiano','breed',array[]::text[],'https://www.akc.org/dog-breeds/volpino-italiano/',100),
('weimaraner','Weimaraner','breed',array[]::text[],'https://www.akc.org/dog-breeds/weimaraner/',100),
('welsh-springer-spaniel','Welsh Springer Spaniel','breed',array[]::text[],'https://www.akc.org/dog-breeds/welsh-springer-spaniel/',100),
('welsh-terrier','Welsh Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/welsh-terrier/',100),
('west-highland-white-terrier','West Highland White Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/west-highland-white-terrier/',100),
('wetterhoun','Wetterhoun','breed',array[]::text[],'https://www.akc.org/dog-breeds/wetterhoun/',100),
('whippet','Whippet','breed',array[]::text[],'https://www.akc.org/dog-breeds/whippet/',100),
('wire-fox-terrier','Wire Fox Terrier','breed',array[]::text[],'https://www.akc.org/dog-breeds/wire-fox-terrier/',100),
('wirehaired-pointing-griffon','Wirehaired Pointing Griffon','breed',array[]::text[],'https://www.akc.org/dog-breeds/wirehaired-pointing-griffon/',100),
('wirehaired-vizsla','Wirehaired Vizsla','breed',array[]::text[],'https://www.akc.org/dog-breeds/wirehaired-vizsla/',100),
('working-kelpie','Working Kelpie','breed',array[]::text[],'https://www.akc.org/dog-breeds/working-kelpie/',100),
('xoloitzcuintli','Xoloitzcuintli','breed',array[]::text[],'https://www.akc.org/dog-breeds/xoloitzcuintli/',100),
('yakutian-laika','Yakutian Laika','breed',array[]::text[],'https://www.akc.org/dog-breeds/yakutian-laika/',100),
('yorkshire-terrier','Yorkshire Terrier','breed',array['Yorkie']::text[],'https://www.akc.org/dog-breeds/yorkshire-terrier/',100),
('other','Other','unspecified',array[]::text[],null,200)
on conflict (id) do update set name=excluded.name,kind=excluded.kind,
  aliases=excluded.aliases,source_url=excluded.source_url,sort_order=excluded.sort_order;

alter table public.fd_breeds enable row level security;
revoke all on public.fd_breeds from public,anon,authenticated;
grant select on public.fd_breeds to anon,authenticated;
drop policy if exists fd_breeds_read on public.fd_breeds;
create policy fd_breeds_read on public.fd_breeds for select to anon,authenticated using (active);

create or replace function public.fd_breed_key(value text) returns text
language sql immutable strict set search_path = '' as $$
  select regexp_replace(lower(trim(value)), '[^[:alnum:]]', '', 'g')
$$;
create or replace function public.fd_resolve_breed(value text) returns text
language sql stable set search_path = '' as $$
  select b.id from public.fd_breeds b
  where b.active and (public.fd_breed_key(b.name)=public.fd_breed_key(coalesce(value,''))
    or exists(select 1 from unnest(b.aliases) a where public.fd_breed_key(a)=public.fd_breed_key(coalesce(value,''))))
  order by case when public.fd_breed_key(b.name)=public.fd_breed_key(value) then 0 else 1 end,b.id limit 1
$$;
revoke all on function public.fd_breed_key(text),public.fd_resolve_breed(text) from public;
grant execute on function public.fd_breed_key(text),public.fd_resolve_breed(text) to anon,authenticated;

alter table public.fd_dogs add column if not exists breed_id text references public.fd_breeds(id);
create index if not exists fd_dogs_breed_id_idx on public.fd_dogs(breed_id);
create or replace function public.fd_sync_dog_breed() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.breed_id := public.fd_resolve_breed(new.breed);
  return new;
end $$;
revoke all on function public.fd_sync_dog_breed() from public;
drop trigger if exists fd_dog_breed_sync on public.fd_dogs;
create trigger fd_dog_breed_sync before insert or update of breed,breed_id on public.fd_dogs
  for each row execute function public.fd_sync_dog_breed();
update public.fd_dogs set breed_id=public.fd_resolve_breed(breed)
  where breed_id is distinct from public.fd_resolve_breed(breed);
notify pgrst,'reload schema';
commit;

-- Verification: Unknown should appear once; the catalog currently contains 320 rows.
select count(*) as breed_count from public.fd_breeds;
select id,name,kind from public.fd_breeds where id in ('unknown','mixed-breed','goldendoodle');


-- Run after 009_restore_public_uploads.sql and 010_breed_catalog.sql.
-- Safe to rerun. Existing images, visibility, ratings and dates are preserved.
begin;
alter table public.fd_dog_photos add column if not exists life_stage text not null default 'unknown'
  check (life_stage in ('unknown','puppy','adult'));
alter table public.fd_lookbook_inspiration add column if not exists life_stage text not null default 'unknown'
  check (life_stage in ('unknown','puppy','adult'));
grant update(life_stage) on public.fd_dog_photos to authenticated;
comment on column public.fd_dog_photos.life_stage is 'Uploader-supplied puppy/adult stage at the time of the photo; never inferred from appearance or current birthday.';

create or replace view public.fd_gallery_source as
select p.id,p.caption,d.name as dog_name,d.breed,p.provider_id,p.provider_label,
  coalesce(loc.label,'') as location_label,p.uploader_type,p.created_at,p.quality_score,p.life_stage
from public.fd_dog_photos p
join public.fd_dogs d on d.id=p.dog_id and d.owner_id=p.owner_id
left join lateral (
  select string_agg(distinct c.name||', '||c.state,' / ' order by c.name||', '||c.state) label
  from public.fd_directory_coverage v join public.fd_directory_cities c on c.id=v.city_id
  where v.business_id=p.provider_id
) loc on true
where p.visibility='public' and (p.quality_score is null or p.quality_score>1)
  and not exists(select 1 from public.fd_lookbook_inspiration i where i.id=p.id)
union all
select i.id,i.caption,i.title as dog_name,i.breed,null::uuid as provider_id,''::text as provider_label,
  ''::text as location_label,'inspiration'::text as uploader_type,i.created_at,i.quality_score,i.life_stage
from public.fd_lookbook_inspiration i where i.published and i.quality_score>1;
revoke all on public.fd_gallery_source from public,anon,authenticated;

-- A separate RPC preserves the original gallery contract during deployment.
-- Filter before pagination, never just the 12 visible cards.
create or replace function public.fd_gallery_search(
  p_breed text default null,p_life_stage text default 'all',
  p_city_id text default null,p_provider_id uuid default null,p_author text default 'all',
  p_before_time timestamptz default null,p_before_id uuid default null,p_photo_id uuid default null)
returns table(id uuid,caption text,dog_name text,breed text,provider_id uuid,provider_label text,
  location_label text,uploader_type text,created_at timestamptz,life_stage text)
language plpgsql stable security definer set search_path='' as $$
declare breed_query text; resolved_breed text;
begin
  if p_author is null or p_author not in ('all','owner','groomer')
    or p_life_stage is null or p_life_stage not in ('all','puppy','adult')
    or length(coalesce(p_breed,''))>180
    or (p_before_time is null)<>(p_before_id is null)
    or (p_city_id is not null and p_provider_id is not null)
    then raise exception 'Invalid gallery filter.' using errcode='22023'; end if;
  breed_query:=public.fd_breed_key(coalesce(p_breed,''));
  resolved_breed:=public.fd_resolve_breed(p_breed);
  if trim(coalesce(p_breed,''))<>'' and breed_query='' then
    raise exception 'Enter a breed name.' using errcode='22023';
  end if;
  return query select g.id,g.caption,g.dog_name,g.breed,g.provider_id,g.provider_label,
    g.location_label,g.uploader_type,g.created_at,g.life_stage
    from public.fd_gallery_source g
    where (breed_query='' or public.fd_resolve_breed(g.breed)=resolved_breed
      or strpos(public.fd_breed_key(g.breed),breed_query)>0)
      and (p_life_stage='all' or g.life_stage=p_life_stage)
      and (p_author='all' or g.uploader_type=p_author)
      and (p_city_id is null or exists(select 1 from public.fd_directory_coverage c where c.business_id=g.provider_id and c.city_id=p_city_id))
      and (p_provider_id is null or g.provider_id=p_provider_id)
      and (p_photo_id is null or g.id=p_photo_id)
      and (p_before_time is null or (g.created_at,g.id)<(p_before_time,p_before_id))
    order by g.created_at desc,g.id desc limit 13;
end $$;
revoke all on function public.fd_gallery_search(text,text,text,uuid,text,timestamptz,uuid,uuid) from public,anon,authenticated;
grant execute on function public.fd_gallery_search(text,text,text,uuid,text,timestamptz,uuid,uuid) to anon,authenticated;
notify pgrst,'reload schema';
commit;

select count(*) as breed_count from public.fd_breeds;
select life_stage,count(*) as public_photos from public.fd_gallery_source group by life_stage;
