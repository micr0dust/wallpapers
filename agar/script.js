// script.js (Refactored for LogicalPlayer and PlayerCell)

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const leaderboardElement = document.getElementById('leaderboard');
const gameContainer = document.getElementById('game-container'); // *** 獲取容器引用 ***
// 如果沒有使用容器，則直接獲取 canvas:
// const gameElementToFade = canvas;
const gameElementToFade = gameContainer || canvas; // *** 選擇要淡化的元素 ***

// --- Global Data Structures ---
let players = []; // Holds LogicalPlayer instances
let foods = [];
let viruses = [];
let feedPellets = [];
let nameList = [
    "Aaren"
    ,
    "Aarika"
    ,
    "Abagael"
    ,
    "Abagail"
    ,
    "Abbe"
    ,
    "Abbey"
    ,
    "Abbi"
    ,
    "Abbie"
    ,
    "Abby"
    ,
    "Abbye"
    ,
    "Abigael"
    ,
    "Abigail"
    ,
    "Abigale"
    ,
    "Abra"
    ,
    "Ada"
    ,
    "Adah"
    ,
    "Adaline"
    ,
    "Adan"
    ,
    "Adara"
    ,
    "Adda"
    ,
    "Addi"
    ,
    "Addia"
    ,
    "Addie"
    ,
    "Addy"
    ,
    "Adel"
    ,
    "Adela"
    ,
    "Adelaida"
    ,
    "Adelaide"
    ,
    "Adele"
    ,
    "Adelheid"
    ,
    "Adelice"
    ,
    "Adelina"
    ,
    "Adelind"
    ,
    "Adeline"
    ,
    "Adella"
    ,
    "Adelle"
    ,
    "Adena"
    ,
    "Adey"
    ,
    "Adi"
    ,
    "Adiana"
    ,
    "Adina"
    ,
    "Adora"
    ,
    "Adore"
    ,
    "Adoree"
    ,
    "Adorne"
    ,
    "Adrea"
    ,
    "Adria"
    ,
    "Adriaens"
    ,
    "Adrian"
    ,
    "Adriana"
    ,
    "Adriane"
    ,
    "Adrianna"
    ,
    "Adrianne"
    ,
    "Adriena"
    ,
    "Adrienne"
    ,
    "Aeriel"
    ,
    "Aeriela"
    ,
    "Aeriell"
    ,
    "Afton"
    ,
    "Ag"
    ,
    "Agace"
    ,
    "Agata"
    ,
    "Agatha"
    ,
    "Agathe"
    ,
    "Aggi"
    ,
    "Aggie"
    ,
    "Aggy"
    ,
    "Agna"
    ,
    "Agnella"
    ,
    "Agnes"
    ,
    "Agnese"
    ,
    "Agnesse"
    ,
    "Agneta"
    ,
    "Agnola"
    ,
    "Agretha"
    ,
    "Aida"
    ,
    "Aidan"
    ,
    "Aigneis"
    ,
    "Aila"
    ,
    "Aile"
    ,
    "Ailee"
    ,
    "Aileen"
    ,
    "Ailene"
    ,
    "Ailey"
    ,
    "Aili"
    ,
    "Ailina"
    ,
    "Ailis"
    ,
    "Ailsun"
    ,
    "Ailyn"
    ,
    "Aime"
    ,
    "Aimee"
    ,
    "Aimil"
    ,
    "Aindrea"
    ,
    "Ainslee"
    ,
    "Ainsley"
    ,
    "Ainslie"
    ,
    "Ajay"
    ,
    "Alaine"
    ,
    "Alameda"
    ,
    "Alana"
    ,
    "Alanah"
    ,
    "Alane"
    ,
    "Alanna"
    ,
    "Alayne"
    ,
    "Alberta"
    ,
    "Albertina"
    ,
    "Albertine"
    ,
    "Albina"
    ,
    "Alecia"
    ,
    "Aleda"
    ,
    "Aleece"
    ,
    "Aleen"
    ,
    "Alejandra"
    ,
    "Alejandrina"
    ,
    "Alena"
    ,
    "Alene"
    ,
    "Alessandra"
    ,
    "Aleta"
    ,
    "Alethea"
    ,
    "Alex"
    ,
    "Alexa"
    ,
    "Alexandra"
    ,
    "Alexandrina"
    ,
    "Alexi"
    ,
    "Alexia"
    ,
    "Alexina"
    ,
    "Alexine"
    ,
    "Alexis"
    ,
    "Alfi"
    ,
    "Alfie"
    ,
    "Alfreda"
    ,
    "Alfy"
    ,
    "Ali"
    ,
    "Alia"
    ,
    "Alica"
    ,
    "Alice"
    ,
    "Alicea"
    ,
    "Alicia"
    ,
    "Alida"
    ,
    "Alidia"
    ,
    "Alie"
    ,
    "Alika"
    ,
    "Alikee"
    ,
    "Alina"
    ,
    "Aline"
    ,
    "Alis"
    ,
    "Alisa"
    ,
    "Alisha"
    ,
    "Alison"
    ,
    "Alissa"
    ,
    "Alisun"
    ,
    "Alix"
    ,
    "Aliza"
    ,
    "Alla"
    ,
    "Alleen"
    ,
    "Allegra"
    ,
    "Allene"
    ,
    "Alli"
    ,
    "Allianora"
    ,
    "Allie"
    ,
    "Allina"
    ,
    "Allis"
    ,
    "Allison"
    ,
    "Allissa"
    ,
    "Allix"
    ,
    "Allsun"
    ,
    "Allx"
    ,
    "Ally"
    ,
    "Allyce"
    ,
    "Allyn"
    ,
    "Allys"
    ,
    "Allyson"
    ,
    "Alma"
    ,
    "Almeda"
    ,
    "Almeria"
    ,
    "Almeta"
    ,
    "Almira"
    ,
    "Almire"
    ,
    "Aloise"
    ,
    "Aloisia"
    ,
    "Aloysia"
    ,
    "Alta"
    ,
    "Althea"
    ,
    "Alvera"
    ,
    "Alverta"
    ,
    "Alvina"
    ,
    "Alvinia"
    ,
    "Alvira"
    ,
    "Alyce"
    ,
    "Alyda"
    ,
    "Alys"
    ,
    "Alysa"
    ,
    "Alyse"
    ,
    "Alysia"
    ,
    "Alyson"
    ,
    "Alyss"
    ,
    "Alyssa"
    ,
    "Amabel"
    ,
    "Amabelle"
    ,
    "Amalea"
    ,
    "Amalee"
    ,
    "Amaleta"
    ,
    "Amalia"
    ,
    "Amalie"
    ,
    "Amalita"
    ,
    "Amalle"
    ,
    "Amanda"
    ,
    "Amandi"
    ,
    "Amandie"
    ,
    "Amandy"
    ,
    "Amara"
    ,
    "Amargo"
    ,
    "Amata"
    ,
    "Amber"
    ,
    "Amberly"
    ,
    "Ambur"
    ,
    "Ame"
    ,
    "Amelia"
    ,
    "Amelie"
    ,
    "Amelina"
    ,
    "Ameline"
    ,
    "Amelita"
    ,
    "Ami"
    ,
    "Amie"
    ,
    "Amii"
    ,
    "Amil"
    ,
    "Amitie"
    ,
    "Amity"
    ,
    "Ammamaria"
    ,
    "Amy"
    ,
    "Amye"
    ,
    "Ana"
    ,
    "Anabal"
    ,
    "Anabel"
    ,
    "Anabella"
    ,
    "Anabelle"
    ,
    "Analiese"
    ,
    "Analise"
    ,
    "Anallese"
    ,
    "Anallise"
    ,
    "Anastasia"
    ,
    "Anastasie"
    ,
    "Anastassia"
    ,
    "Anatola"
    ,
    "Andee"
    ,
    "Andeee"
    ,
    "Anderea"
    ,
    "Andi"
    ,
    "Andie"
    ,
    "Andra"
    ,
    "Andrea"
    ,
    "Andreana"
    ,
    "Andree"
    ,
    "Andrei"
    ,
    "Andria"
    ,
    "Andriana"
    ,
    "Andriette"
    ,
    "Andromache"
    ,
    "Andy"
    ,
    "Anestassia"
    ,
    "Anet"
    ,
    "Anett"
    ,
    "Anetta"
    ,
    "Anette"
    ,
    "Ange"
    ,
    "Angel"
    ,
    "Angela"
    ,
    "Angele"
    ,
    "Angelia"
    ,
    "Angelica"
    ,
    "Angelika"
    ,
    "Angelina"
    ,
    "Angeline"
    ,
    "Angelique"
    ,
    "Angelita"
    ,
    "Angelle"
    ,
    "Angie"
    ,
    "Angil"
    ,
    "Angy"
    ,
    "Ania"
    ,
    "Anica"
    ,
    "Anissa"
    ,
    "Anita"
    ,
    "Anitra"
    ,
    "Anjanette"
    ,
    "Anjela"
    ,
    "Ann"
    ,
    "Ann-Marie"
    ,
    "Anna"
    ,
    "Anna-Diana"
    ,
    "Anna-Diane"
    ,
    "Anna-Maria"
    ,
    "Annabal"
    ,
    "Annabel"
    ,
    "Annabela"
    ,
    "Annabell"
    ,
    "Annabella"
    ,
    "Annabelle"
    ,
    "Annadiana"
    ,
    "Annadiane"
    ,
    "Annalee"
    ,
    "Annaliese"
    ,
    "Annalise"
    ,
    "Annamaria"
    ,
    "Annamarie"
    ,
    "Anne"
    ,
    "Anne-Corinne"
    ,
    "Anne-Marie"
    ,
    "Annecorinne"
    ,
    "Anneliese"
    ,
    "Annelise"
    ,
    "Annemarie"
    ,
    "Annetta"
    ,
    "Annette"
    ,
    "Anni"
    ,
    "Annice"
    ,
    "Annie"
    ,
    "Annis"
    ,
    "Annissa"
    ,
    "Annmaria"
    ,
    "Annmarie"
    ,
    "Annnora"
    ,
    "Annora"
    ,
    "Anny"
    ,
    "Anselma"
    ,
    "Ansley"
    ,
    "Anstice"
    ,
    "Anthe"
    ,
    "Anthea"
    ,
    "Anthia"
    ,
    "Anthiathia"
    ,
    "Antoinette"
    ,
    "Antonella"
    ,
    "Antonetta"
    ,
    "Antonia"
    ,
    "Antonie"
    ,
    "Antonietta"
    ,
    "Antonina"
    ,
    "Anya"
    ,
    "Appolonia"
    ,
    "April"
    ,
    "Aprilette"
    ,
    "Ara"
    ,
    "Arabel"
    ,
    "Arabela"
    ,
    "Arabele"
    ,
    "Arabella"
    ,
    "Arabelle"
    ,
    "Arda"
    ,
    "Ardath"
    ,
    "Ardeen"
    ,
    "Ardelia"
    ,
    "Ardelis"
    ,
    "Ardella"
    ,
    "Ardelle"
    ,
    "Arden"
    ,
    "Ardene"
    ,
    "Ardenia"
    ,
    "Ardine"
    ,
    "Ardis"
    ,
    "Ardisj"
    ,
    "Ardith"
    ,
    "Ardra"
    ,
    "Ardyce"
    ,
    "Ardys"
    ,
    "Ardyth"
    ,
    "Aretha"
    ,
    "Ariadne"
    ,
    "Ariana"
    ,
    "Aridatha"
    ,
    "Ariel"
    ,
    "Ariela"
    ,
    "Ariella"
    ,
    "Arielle"
    ,
    "Arlana"
    ,
    "Arlee"
    ,
    "Arleen"
    ,
    "Arlen"
    ,
    "Arlena"
    ,
    "Arlene"
    ,
    "Arleta"
    ,
    "Arlette"
    ,
    "Arleyne"
    ,
    "Arlie"
    ,
    "Arliene"
    ,
    "Arlina"
    ,
    "Arlinda"
    ,
    "Arline"
    ,
    "Arluene"
    ,
    "Arly"
    ,
    "Arlyn"
    ,
    "Arlyne"
    ,
    "Aryn"
    ,
    "Ashely"
    ,
    "Ashia"
    ,
    "Ashien"
    ,
    "Ashil"
    ,
    "Ashla"
    ,
    "Ashlan"
    ,
    "Ashlee"
    ,
    "Ashleigh"
    ,
    "Ashlen"
    ,
    "Ashley"
    ,
    "Ashli"
    ,
    "Ashlie"
    ,
    "Ashly"
    ,
    "Asia"
    ,
    "Astra"
    ,
    "Astrid"
    ,
    "Astrix"
    ,
    "Atalanta"
    ,
    "Athena"
    ,
    "Athene"
    ,
    "Atlanta"
    ,
    "Atlante"
    ,
    "Auberta"
    ,
    "Aubine"
    ,
    "Aubree"
    ,
    "Aubrette"
    ,
    "Aubrey"
    ,
    "Aubrie"
    ,
    "Aubry"
    ,
    "Audi"
    ,
    "Audie"
    ,
    "Audra"
    ,
    "Audre"
    ,
    "Audrey"
    ,
    "Audrie"
    ,
    "Audry"
    ,
    "Audrye"
    ,
    "Audy"
    ,
    "Augusta"
    ,
    "Auguste"
    ,
    "Augustina"
    ,
    "Augustine"
    ,
    "Aundrea"
    ,
    "Aura"
    ,
    "Aurea"
    ,
    "Aurel"
    ,
    "Aurelea"
    ,
    "Aurelia"
    ,
    "Aurelie"
    ,
    "Auria"
    ,
    "Aurie"
    ,
    "Aurilia"
    ,
    "Aurlie"
    ,
    "Auroora"
    ,
    "Aurora"
    ,
    "Aurore"
    ,
    "Austin"
    ,
    "Austina"
    ,
    "Austine"
    ,
    "Ava"
    ,
    "Aveline"
    ,
    "Averil"
    ,
    "Averyl"
    ,
    "Avie"
    ,
    "Avis"
    ,
    "Aviva"
    ,
    "Avivah"
    ,
    "Avril"
    ,
    "Avrit"
    ,
    "Ayn"
    ,
    "Bab"
    ,
    "Babara"
    ,
    "Babb"
    ,
    "Babbette"
    ,
    "Babbie"
    ,
    "Babette"
    ,
    "Babita"
    ,
    "Babs"
    ,
    "Bambi"
    ,
    "Bambie"
    ,
    "Bamby"
    ,
    "Barb"
    ,
    "Barbabra"
    ,
    "Barbara"
    ,
    "Barbara-Anne"
    ,
    "Barbaraanne"
    ,
    "Barbe"
    ,
    "Barbee"
    ,
    "Barbette"
    ,
    "Barbey"
    ,
    "Barbi"
    ,
    "Barbie"
    ,
    "Barbra"
    ,
    "Barby"
    ,
    "Bari"
    ,
    "Barrie"
    ,
    "Barry"
    ,
    "Basia"
    ,
    "Bathsheba"
    ,
    "Batsheva"
    ,
    "Bea"
    ,
    "Beatrice"
    ,
    "Beatrisa"
    ,
    "Beatrix"
    ,
    "Beatriz"
    ,
    "Bebe"
    ,
    "Becca"
    ,
    "Becka"
    ,
    "Becki"
    ,
    "Beckie"
    ,
    "Becky"
    ,
    "Bee"
    ,
    "Beilul"
    ,
    "Beitris"
    ,
    "Bekki"
    ,
    "Bel"
    ,
    "Belia"
    ,
    "Belicia"
    ,
    "Belinda"
    ,
    "Belita"
    ,
    "Bell"
    ,
    "Bella"
    ,
    "Bellanca"
    ,
    "Belle"
    ,
    "Bellina"
    ,
    "Belva"
    ,
    "Belvia"
    ,
    "Bendite"
    ,
    "Benedetta"
    ,
    "Benedicta"
    ,
    "Benedikta"
    ,
    "Benetta"
    ,
    "Benita"
    ,
    "Benni"
    ,
    "Bennie"
    ,
    "Benny"
    ,
    "Benoite"
    ,
    "Berenice"
    ,
    "Beret"
    ,
    "Berget"
    ,
    "Berna"
    ,
    "Bernadene"
    ,
    "Bernadette"
    ,
    "Bernadina"
    ,
    "Bernadine"
    ,
    "Bernardina"
    ,
    "Bernardine"
    ,
    "Bernelle"
    ,
    "Bernete"
    ,
    "Bernetta"
    ,
    "Bernette"
    ,
    "Berni"
    ,
    "Bernice"
    ,
    "Bernie"
    ,
    "Bernita"
    ,
    "Berny"
    ,
    "Berri"
    ,
    "Berrie"
    ,
    "Berry"
    ,
    "Bert"
    ,
    "Berta"
    ,
    "Berte"
    ,
    "Bertha"
    ,
    "Berthe"
    ,
    "Berti"
    ,
    "Bertie"
    ,
    "Bertina"
    ,
    "Bertine"
    ,
    "Berty"
    ,
    "Beryl"
    ,
    "Beryle"
    ,
    "Bess"
    ,
    "Bessie"
    ,
    "Bessy"
    ,
    "Beth"
    ,
    "Bethanne"
    ,
    "Bethany"
    ,
    "Bethena"
    ,
    "Bethina"
    ,
    "Betsey"
    ,
    "Betsy"
    ,
    "Betta"
    ,
    "Bette"
    ,
    "Bette-Ann"
    ,
    "Betteann"
    ,
    "Betteanne"
    ,
    "Betti"
    ,
    "Bettina"
    ,
    "Bettine"
    ,
    "Betty"
    ,
    "Bettye"
    ,
    "Beulah"
    ,
    "Bev"
    ,
    "Beverie"
    ,
    "Beverlee"
    ,
    "Beverley"
    ,
    "Beverlie"
    ,
    "Beverly"
    ,
    "Bevvy"
    ,
    "Bianca"
    ,
    "Bianka"
    ,
    "Bibbie"
    ,
    "Bibby"
    ,
    "Bibbye"
    ,
    "Bibi"
    ,
    "Biddie"
    ,
    "Biddy"
    ,
    "Bidget"
    ,
    "Bili"
    ,
    "Bill"
    ,
    "Billi"
    ,
    "Billie"
    ,
    "Billy"
    ,
    "Billye"
    ,
    "Binni"
    ,
    "Binnie"
    ,
    "Binny"
    ,
    "Bird"
    ,
    "Birdie"
    ,
    "Birgit"
    ,
    "Birgitta"
    ,
    "Blair"
    ,
    "Blaire"
    ,
    "Blake"
    ,
    "Blakelee"
    ,
    "Blakeley"
    ,
    "Blanca"
    ,
    "Blanch"
    ,
    "Blancha"
    ,
    "Blanche"
    ,
    "Blinni"
    ,
    "Blinnie"
    ,
    "Blinny"
    ,
    "Bliss"
    ,
    "Blisse"
    ,
    "Blithe"
    ,
    "Blondell"
    ,
    "Blondelle"
    ,
    "Blondie"
    ,
    "Blondy"
    ,
    "Blythe"
    ,
    "Bobbe"
    ,
    "Bobbee"
    ,
    "Bobbette"
    ,
    "Bobbi"
    ,
    "Bobbie"
    ,
    "Bobby"
    ,
    "Bobbye"
    ,
    "Bobette"
    ,
    "Bobina"
    ,
    "Bobine"
    ,
    "Bobinette"
    ,
    "Bonita"
    ,
    "Bonnee"
    ,
    "Bonni"
    ,
    "Bonnibelle"
    ,
    "Bonnie"
    ,
    "Bonny"
    ,
    "Brana"
    ,
    "Brandais"
    ,
    "Brande"
    ,
    "Brandea"
    ,
    "Brandi"
    ,
    "Brandice"
    ,
    "Brandie"
    ,
    "Brandise"
    ,
    "Brandy"
    ,
    "Breanne"
    ,
    "Brear"
    ,
    "Bree"
    ,
    "Breena"
    ,
    "Bren"
    ,
    "Brena"
    ,
    "Brenda"
    ,
    "Brenn"
    ,
    "Brenna"
    ,
    "Brett"
    ,
    "Bria"
    ,
    "Briana"
    ,
    "Brianna"
    ,
    "Brianne"
    ,
    "Bride"
    ,
    "Bridget"
    ,
    "Bridgette"
    ,
    "Bridie"
    ,
    "Brier"
    ,
    "Brietta"
    ,
    "Brigid"
    ,
    "Brigida"
    ,
    "Brigit"
    ,
    "Brigitta"
    ,
    "Brigitte"
    ,
    "Brina"
    ,
    "Briney"
    ,
    "Brinn"
    ,
    "Brinna"
    ,
    "Briny"
    ,
    "Brit"
    ,
    "Brita"
    ,
    "Britney"
    ,
    "Britni"
    ,
    "Britt"
    ,
    "Britta"
    ,
    "Brittan"
    ,
    "Brittaney"
    ,
    "Brittani"
    ,
    "Brittany"
    ,
    "Britte"
    ,
    "Britteny"
    ,
    "Brittne"
    ,
    "Brittney"
    ,
    "Brittni"
    ,
    "Brook"
    ,
    "Brooke"
    ,
    "Brooks"
    ,
    "Brunhilda"
    ,
    "Brunhilde"
    ,
    "Bryana"
    ,
    "Bryn"
    ,
    "Bryna"
    ,
    "Brynn"
    ,
    "Brynna"
    ,
    "Brynne"
    ,
    "Buffy"
    ,
    "Bunni"
    ,
    "Bunnie"
    ,
    "Bunny"
    ,
    "Cacilia"
    ,
    "Cacilie"
    ,
    "Cahra"
    ,
    "Cairistiona"
    ,
    "Caitlin"
    ,
    "Caitrin"
    ,
    "Cal"
    ,
    "Calida"
    ,
    "Calla"
    ,
    "Calley"
    ,
    "Calli"
    ,
    "Callida"
    ,
    "Callie"
    ,
    "Cally"
    ,
    "Calypso"
    ,
    "Cam"
    ,
    "Camala"
    ,
    "Camel"
    ,
    "Camella"
    ,
    "Camellia"
    ,
    "Cami"
    ,
    "Camila"
    ,
    "Camile"
    ,
    "Camilla"
    ,
    "Camille"
    ,
    "Cammi"
    ,
    "Cammie"
    ,
    "Cammy"
    ,
    "Candace"
    ,
    "Candi"
    ,
    "Candice"
    ,
    "Candida"
    ,
    "Candide"
    ,
    "Candie"
    ,
    "Candis"
    ,
    "Candra"
    ,
    "Candy"
    ,
    "Caprice"
    ,
    "Cara"
    ,
    "Caralie"
    ,
    "Caren"
    ,
    "Carena"
    ,
    "Caresa"
    ,
    "Caressa"
    ,
    "Caresse"
    ,
    "Carey"
    ,
    "Cari"
    ,
    "Caria"
    ,
    "Carie"
    ,
    "Caril"
    ,
    "Carilyn"
    ,
    "Carin"
    ,
    "Carina"
    ,
    "Carine"
    ,
    "Cariotta"
    ,
    "Carissa"
    ,
    "Carita"
    ,
    "Caritta"
    ,
    "Carla"
    ,
    "Carlee"
    ,
    "Carleen"
    ,
    "Carlen"
    ,
    "Carlene"
    ,
    "Carley"
    ,
    "Carlie"
    ,
    "Carlin"
    ,
    "Carlina"
    ,
    "Carline"
    ,
    "Carlita"
    ,
    "Carlota"
    ,
    "Carlotta"
    ,
    "Carly"
    ,
    "Carlye"
    ,
    "Carlyn"
    ,
    "Carlynn"
    ,
    "Carlynne"
    ,
    "Carma"
    ,
    "Carmel"
    ,
    "Carmela"
    ,
    "Carmelia"
    ,
    "Carmelina"
    ,
    "Carmelita"
    ,
    "Carmella"
    ,
    "Carmelle"
    ,
    "Carmen"
    ,
    "Carmencita"
    ,
    "Carmina"
    ,
    "Carmine"
    ,
    "Carmita"
    ,
    "Carmon"
    ,
    "Caro"
    ,
    "Carol"
    ,
    "Carol-Jean"
    ,
    "Carola"
    ,
    "Carolan"
    ,
    "Carolann"
    ,
    "Carole"
    ,
    "Carolee"
    ,
    "Carolin"
    ,
    "Carolina"
    ,
    "Caroline"
    ,
    "Caroljean"
    ,
    "Carolyn"
    ,
    "Carolyne"
    ,
    "Carolynn"
    ,
    "Caron"
    ,
    "Carree"
    ,
    "Carri"
    ,
    "Carrie"
    ,
    "Carrissa"
    ,
    "Carroll"
    ,
    "Carry"
    ,
    "Cary"
    ,
    "Caryl"
    ,
    "Caryn"
    ,
    "Casandra"
    ,
    "Casey"
    ,
    "Casi"
    ,
    "Casie"
    ,
    "Cass"
    ,
    "Cassandra"
    ,
    "Cassandre"
    ,
    "Cassandry"
    ,
    "Cassaundra"
    ,
    "Cassey"
    ,
    "Cassi"
    ,
    "Cassie"
    ,
    "Cassondra"
    ,
    "Cassy"
    ,
    "Catarina"
    ,
    "Cate"
    ,
    "Caterina"
    ,
    "Catha"
    ,
    "Catharina"
    ,
    "Catharine"
    ,
    "Cathe"
    ,
    "Cathee"
    ,
    "Catherin"
    ,
    "Catherina"
    ,
    "Catherine"
    ,
    "Cathi"
    ,
    "Cathie"
    ,
    "Cathleen"
    ,
    "Cathlene"
    ,
    "Cathrin"
    ,
    "Cathrine"
    ,
    "Cathryn"
    ,
    "Cathy"
    ,
    "Cathyleen"
    ,
    "Cati"
    ,
    "Catie"
    ,
    "Catina"
    ,
    "Catlaina"
    ,
    "Catlee"
    ,
    "Catlin"
    ,
    "Catrina"
    ,
    "Catriona"
    ,
    "Caty"
    ,
    "Caye"
    ,
    "Cayla"
    ,
    "Cecelia"
    ,
    "Cecil"
    ,
    "Cecile"
    ,
    "Ceciley"
    ,
    "Cecilia"
    ,
    "Cecilla"
    ,
    "Cecily"
    ,
    "Ceil"
    ,
    "Cele"
    ,
    "Celene"
    ,
    "Celesta"
    ,
    "Celeste"
    ,
    "Celestia"
    ,
    "Celestina"
    ,
    "Celestine"
    ,
    "Celestyn"
    ,
    "Celestyna"
    ,
    "Celia"
    ,
    "Celie"
    ,
    "Celina"
    ,
    "Celinda"
    ,
    "Celine"
    ,
    "Celinka"
    ,
    "Celisse"
    ,
    "Celka"
    ,
    "Celle"
    ,
    "Cesya"
    ,
    "Chad"
    ,
    "Chanda"
    ,
    "Chandal"
    ,
    "Chandra"
    ,
    "Channa"
    ,
    "Chantal"
    ,
    "Chantalle"
    ,
    "Charil"
    ,
    "Charin"
    ,
    "Charis"
    ,
    "Charissa"
    ,
    "Charisse"
    ,
    "Charita"
    ,
    "Charity"
    ,
    "Charla"
    ,
    "Charlean"
    ,
    "Charleen"
    ,
    "Charlena"
    ,
    "Charlene"
    ,
    "Charline"
    ,
    "Charlot"
    ,
    "Charlotta"
    ,
    "Charlotte"
    ,
    "Charmain"
    ,
    "Charmaine"
    ,
    "Charmane"
    ,
    "Charmian"
    ,
    "Charmine"
    ,
    "Charmion"
    ,
    "Charo"
    ,
    "Charyl"
    ,
    "Chastity"
    ,
    "Chelsae"
    ,
    "Chelsea"
    ,
    "Chelsey"
    ,
    "Chelsie"
    ,
    "Chelsy"
    ,
    "Cher"
    ,
    "Chere"
    ,
    "Cherey"
    ,
    "Cheri"
    ,
    "Cherianne"
    ,
    "Cherice"
    ,
    "Cherida"
    ,
    "Cherie"
    ,
    "Cherilyn"
    ,
    "Cherilynn"
    ,
    "Cherin"
    ,
    "Cherise"
    ,
    "Cherish"
    ,
    "Cherlyn"
    ,
    "Cherri"
    ,
    "Cherrita"
    ,
    "Cherry"
    ,
    "Chery"
    ,
    "Cherye"
    ,
    "Cheryl"
    ,
    "Cheslie"
    ,
    "Chiarra"
    ,
    "Chickie"
    ,
    "Chicky"
    ,
    "Chiquia"
    ,
    "Chiquita"
    ,
    "Chlo"
    ,
    "Chloe"
    ,
    "Chloette"
    ,
    "Chloris"
    ,
    "Chris"
    ,
    "Chrissie"
    ,
    "Chrissy"
    ,
    "Christa"
    ,
    "Christabel"
    ,
    "Christabella"
    ,
    "Christal"
    ,
    "Christalle"
    ,
    "Christan"
    ,
    "Christean"
    ,
    "Christel"
    ,
    "Christen"
    ,
    "Christi"
    ,
    "Christian"
    ,
    "Christiana"
    ,
    "Christiane"
    ,
    "Christie"
    ,
    "Christin"
    ,
    "Christina"
    ,
    "Christine"
    ,
    "Christy"
    ,
    "Christye"
    ,
    "Christyna"
    ,
    "Chrysa"
    ,
    "Chrysler"
    ,
    "Chrystal"
    ,
    "Chryste"
    ,
    "Chrystel"
    ,
    "Cicely"
    ,
    "Cicily"
    ,
    "Ciel"
    ,
    "Cilka"
    ,
    "Cinda"
    ,
    "Cindee"
    ,
    "Cindelyn"
    ,
    "Cinderella"
    ,
    "Cindi"
    ,
    "Cindie"
    ,
    "Cindra"
    ,
    "Cindy"
    ,
    "Cinnamon"
    ,
    "Cissiee"
    ,
    "Cissy"
    ,
    "Clair"
    ,
    "Claire"
    ,
    "Clara"
    ,
    "Clarabelle"
    ,
    "Clare"
    ,
    "Claresta"
    ,
    "Clareta"
    ,
    "Claretta"
    ,
    "Clarette"
    ,
    "Clarey"
    ,
    "Clari"
    ,
    "Claribel"
    ,
    "Clarice"
    ,
    "Clarie"
    ,
    "Clarinda"
    ,
    "Clarine"
    ,
    "Clarissa"
    ,
    "Clarisse"
    ,
    "Clarita"
    ,
    "Clary"
    ,
    "Claude"
    ,
    "Claudelle"
    ,
    "Claudetta"
    ,
    "Claudette"
    ,
    "Claudia"
    ,
    "Claudie"
    ,
    "Claudina"
    ,
    "Claudine"
    ,
    "Clea"
    ,
    "Clem"
    ,
    "Clemence"
    ,
    "Clementia"
    ,
    "Clementina"
    ,
    "Clementine"
    ,
    "Clemmie"
    ,
    "Clemmy"
    ,
    "Cleo"
    ,
    "Cleopatra"
    ,
    "Clerissa"
    ,
    "Clio"
    ,
    "Clo"
    ,
    "Cloe"
    ,
    "Cloris"
    ,
    "Clotilda"
    ,
    "Clovis"
    ,
    "Codee"
    ,
    "Codi"
    ,
    "Codie"
    ,
    "Cody"
    ,
    "Coleen"
    ,
    "Colene"
    ,
    "Coletta"
    ,
    "Colette"
    ,
    "Colleen"
    ,
    "Collen"
    ,
    "Collete"
    ,
    "Collette"
    ,
    "Collie"
    ,
    "Colline"
    ,
    "Colly"
    ,
    "Con"
    ,
    "Concettina"
    ,
    "Conchita"
    ,
    "Concordia"
    ,
    "Conni"
    ,
    "Connie"
    ,
    "Conny"
    ,
    "Consolata"
    ,
    "Constance"
    ,
    "Constancia"
    ,
    "Constancy"
    ,
    "Constanta"
    ,
    "Constantia"
    ,
    "Constantina"
    ,
    "Constantine"
    ,
    "Consuela"
    ,
    "Consuelo"
    ,
    "Cookie"
    ,
    "Cora"
    ,
    "Corabel"
    ,
    "Corabella"
    ,
    "Corabelle"
    ,
    "Coral"
    ,
    "Coralie"
    ,
    "Coraline"
    ,
    "Coralyn"
    ,
    "Cordelia"
    ,
    "Cordelie"
    ,
    "Cordey"
    ,
    "Cordi"
    ,
    "Cordie"
    ,
    "Cordula"
    ,
    "Cordy"
    ,
    "Coreen"
    ,
    "Corella"
    ,
    "Corenda"
    ,
    "Corene"
    ,
    "Coretta"
    ,
    "Corette"
    ,
    "Corey"
    ,
    "Cori"
    ,
    "Corie"
    ,
    "Corilla"
    ,
    "Corina"
    ,
    "Corine"
    ,
    "Corinna"
    ,
    "Corinne"
    ,
    "Coriss"
    ,
    "Corissa"
    ,
    "Corliss"
    ,
    "Corly"
    ,
    "Cornela"
    ,
    "Cornelia"
    ,
    "Cornelle"
    ,
    "Cornie"
    ,
    "Corny"
    ,
    "Correna"
    ,
    "Correy"
    ,
    "Corri"
    ,
    "Corrianne"
    ,
    "Corrie"
    ,
    "Corrina"
    ,
    "Corrine"
    ,
    "Corrinne"
    ,
    "Corry"
    ,
    "Cortney"
    ,
    "Cory"
    ,
    "Cosetta"
    ,
    "Cosette"
    ,
    "Costanza"
    ,
    "Courtenay"
    ,
    "Courtnay"
    ,
    "Courtney"
    ,
    "Crin"
    ,
    "Cris"
    ,
    "Crissie"
    ,
    "Crissy"
    ,
    "Crista"
    ,
    "Cristabel"
    ,
    "Cristal"
    ,
    "Cristen"
    ,
    "Cristi"
    ,
    "Cristie"
    ,
    "Cristin"
    ,
    "Cristina"
    ,
    "Cristine"
    ,
    "Cristionna"
    ,
    "Cristy"
    ,
    "Crysta"
    ,
    "Crystal"
    ,
    "Crystie"
    ,
    "Cthrine"
    ,
    "Cyb"
    ,
    "Cybil"
    ,
    "Cybill"
    ,
    "Cymbre"
    ,
    "Cynde"
    ,
    "Cyndi"
    ,
    "Cyndia"
    ,
    "Cyndie"
    ,
    "Cyndy"
    ,
    "Cynthea"
    ,
    "Cynthia"
    ,
    "Cynthie"
    ,
    "Cynthy"
    ,
    "Dacey"
    ,
    "Dacia"
    ,
    "Dacie"
    ,
    "Dacy"
    ,
    "Dael"
    ,
    "Daffi"
    ,
    "Daffie"
    ,
    "Daffy"
    ,
    "Dagmar"
    ,
    "Dahlia"
    ,
    "Daile"
    ,
    "Daisey"
    ,
    "Daisi"
    ,
    "Daisie"
    ,
    "Daisy"
    ,
    "Dale"
    ,
    "Dalenna"
    ,
    "Dalia"
    ,
    "Dalila"
    ,
    "Dallas"
    ,
    "Daloris"
    ,
    "Damara"
    ,
    "Damaris"
    ,
    "Damita"
    ,
    "Dana"
    ,
    "Danell"
    ,
    "Danella"
    ,
    "Danette"
    ,
    "Dani"
    ,
    "Dania"
    ,
    "Danica"
    ,
    "Danice"
    ,
    "Daniela"
    ,
    "Daniele"
    ,
    "Daniella"
    ,
    "Danielle"
    ,
    "Danika"
    ,
    "Danila"
    ,
    "Danit"
    ,
    "Danita"
    ,
    "Danna"
    ,
    "Danni"
    ,
    "Dannie"
    ,
    "Danny"
    ,
    "Dannye"
    ,
    "Danya"
    ,
    "Danyelle"
    ,
    "Danyette"
    ,
    "Daphene"
    ,
    "Daphna"
    ,
    "Daphne"
    ,
    "Dara"
    ,
    "Darb"
    ,
    "Darbie"
    ,
    "Darby"
    ,
    "Darcee"
    ,
    "Darcey"
    ,
    "Darci"
    ,
    "Darcie"
    ,
    "Darcy"
    ,
    "Darda"
    ,
    "Dareen"
    ,
    "Darell"
    ,
    "Darelle"
    ,
    "Dari"
    ,
    "Daria"
    ,
    "Darice"
    ,
    "Darla"
    ,
    "Darleen"
    ,
    "Darlene"
    ,
    "Darline"
    ,
    "Darlleen"
    ,
    "Daron"
    ,
    "Darrelle"
    ,
    "Darryl"
    ,
    "Darsey"
    ,
    "Darsie"
    ,
    "Darya"
    ,
    "Daryl"
    ,
    "Daryn"
    ,
    "Dasha"
    ,
    "Dasi"
    ,
    "Dasie"
    ,
    "Dasya"
    ,
    "Datha"
    ,
    "Daune"
    ,
    "Daveen"
    ,
    "Daveta"
    ,
    "Davida"
    ,
    "Davina"
    ,
    "Davine"
    ,
    "Davita"
    ,
    "Dawn"
    ,
    "Dawna"
    ,
    "Dayle"
    ,
    "Dayna"
    ,
    "Ddene"
    ,
    "De"
    ,
    "Deana"
    ,
    "Deane"
    ,
    "Deanna"
    ,
    "Deanne"
    ,
    "Deb"
    ,
    "Debbi"
    ,
    "Debbie"
    ,
    "Debby"
    ,
    "Debee"
    ,
    "Debera"
    ,
    "Debi"
    ,
    "Debor"
    ,
    "Debora"
    ,
    "Deborah"
    ,
    "Debra"
    ,
    "Dede"
    ,
    "Dedie"
    ,
    "Dedra"
    ,
    "Dee"
    ,
    "Dee Dee"
    ,
    "Deeann"
    ,
    "Deeanne"
    ,
    "Deedee"
    ,
    "Deena"
    ,
    "Deerdre"
    ,
    "Deeyn"
    ,
    "Dehlia"
    ,
    "Deidre"
    ,
    "Deina"
    ,
    "Deirdre"
    ,
    "Del"
    ,
    "Dela"
    ,
    "Delcina"
    ,
    "Delcine"
    ,
    "Delia"
    ,
    "Delila"
    ,
    "Delilah"
    ,
    "Delinda"
    ,
    "Dell"
    ,
    "Della"
    ,
    "Delly"
    ,
    "Delora"
    ,
    "Delores"
    ,
    "Deloria"
    ,
    "Deloris"
    ,
    "Delphine"
    ,
    "Delphinia"
    ,
    "Demeter"
    ,
    "Demetra"
    ,
    "Demetria"
    ,
    "Demetris"
    ,
    "Dena"
    ,
    "Deni"
    ,
    "Denice"
    ,
    "Denise"
    ,
    "Denna"
    ,
    "Denni"
    ,
    "Dennie"
    ,
    "Denny"
    ,
    "Deny"
    ,
    "Denys"
    ,
    "Denyse"
    ,
    "Deonne"
    ,
    "Desdemona"
    ,
    "Desirae"
    ,
    "Desiree"
    ,
    "Desiri"
    ,
    "Deva"
    ,
    "Devan"
    ,
    "Devi"
    ,
    "Devin"
    ,
    "Devina"
    ,
    "Devinne"
    ,
    "Devon"
    ,
    "Devondra"
    ,
    "Devonna"
    ,
    "Devonne"
    ,
    "Devora"
    ,
    "Di"
    ,
    "Diahann"
    ,
    "Dian"
    ,
    "Diana"
    ,
    "Diandra"
    ,
    "Diane"
    ,
    "Diane-Marie"
    ,
    "Dianemarie"
    ,
    "Diann"
    ,
    "Dianna"
    ,
    "Dianne"
    ,
    "Diannne"
    ,
    "Didi"
    ,
    "Dido"
    ,
    "Diena"
    ,
    "Dierdre"
    ,
    "Dina"
    ,
    "Dinah"
    ,
    "Dinnie"
    ,
    "Dinny"
    ,
    "Dion"
    ,
    "Dione"
    ,
    "Dionis"
    ,
    "Dionne"
    ,
    "Dita"
    ,
    "Dix"
    ,
    "Dixie"
    ,
    "Dniren"
    ,
    "Dode"
    ,
    "Dodi"
    ,
    "Dodie"
    ,
    "Dody"
    ,
    "Doe"
    ,
    "Doll"
    ,
    "Dolley"
    ,
    "Dolli"
    ,
    "Dollie"
    ,
    "Dolly"
    ,
    "Dolores"
    ,
    "Dolorita"
    ,
    "Doloritas"
    ,
    "Domeniga"
    ,
    "Dominga"
    ,
    "Domini"
    ,
    "Dominica"
    ,
    "Dominique"
    ,
    "Dona"
    ,
    "Donella"
    ,
    "Donelle"
    ,
    "Donetta"
    ,
    "Donia"
    ,
    "Donica"
    ,
    "Donielle"
    ,
    "Donna"
    ,
    "Donnamarie"
    ,
    "Donni"
    ,
    "Donnie"
    ,
    "Donny"
    ,
    "Dora"
    ,
    "Doralia"
    ,
    "Doralin"
    ,
    "Doralyn"
    ,
    "Doralynn"
    ,
    "Doralynne"
    ,
    "Dore"
    ,
    "Doreen"
    ,
    "Dorelia"
    ,
    "Dorella"
    ,
    "Dorelle"
    ,
    "Dorena"
    ,
    "Dorene"
    ,
    "Doretta"
    ,
    "Dorette"
    ,
    "Dorey"
    ,
    "Dori"
    ,
    "Doria"
    ,
    "Dorian"
    ,
    "Dorice"
    ,
    "Dorie"
    ,
    "Dorine"
    ,
    "Doris"
    ,
    "Dorisa"
    ,
    "Dorise"
    ,
    "Dorita"
    ,
    "Doro"
    ,
    "Dorolice"
    ,
    "Dorolisa"
    ,
    "Dorotea"
    ,
    "Doroteya"
    ,
    "Dorothea"
    ,
    "Dorothee"
    ,
    "Dorothy"
    ,
    "Dorree"
    ,
    "Dorri"
    ,
    "Dorrie"
    ,
    "Dorris"
    ,
    "Dorry"
    ,
    "Dorthea"
    ,
    "Dorthy"
    ,
    "Dory"
    ,
    "Dosi"
    ,
    "Dot"
    ,
    "Doti"
    ,
    "Dotti"
    ,
    "Dottie"
    ,
    "Dotty"
    ,
    "Dre"
    ,
    "Dreddy"
    ,
    "Dredi"
    ,
    "Drona"
    ,
    "Dru"
    ,
    "Druci"
    ,
    "Drucie"
    ,
    "Drucill"
    ,
    "Drucy"
    ,
    "Drusi"
    ,
    "Drusie"
    ,
    "Drusilla"
    ,
    "Drusy"
    ,
    "Dulce"
    ,
    "Dulcea"
    ,
    "Dulci"
    ,
    "Dulcia"
    ,
    "Dulciana"
    ,
    "Dulcie"
    ,
    "Dulcine"
    ,
    "Dulcinea"
    ,
    "Dulcy"
    ,
    "Dulsea"
    ,
    "Dusty"
    ,
    "Dyan"
    ,
    "Dyana"
    ,
    "Dyane"
    ,
    "Dyann"
    ,
    "Dyanna"
    ,
    "Dyanne"
    ,
    "Dyna"
    ,
    "Dynah"
    ,
    "Eachelle"
    ,
    "Eada"
    ,
    "Eadie"
    ,
    "Eadith"
    ,
    "Ealasaid"
    ,
    "Eartha"
    ,
    "Easter"
    ,
    "Eba"
    ,
    "Ebba"
    ,
    "Ebonee"
    ,
    "Ebony"
    ,
    "Eda"
    ,
    "Eddi"
    ,
    "Eddie"
    ,
    "Eddy"
    ,
    "Ede"
    ,
    "Edee"
    ,
    "Edeline"
    ,
    "Eden"
    ,
    "Edi"
    ,
    "Edie"
    ,
    "Edin"
    ,
    "Edita"
    ,
    "Edith"
    ,
    "Editha"
    ,
    "Edithe"
    ,
    "Ediva"
    ,
    "Edna"
    ,
    "Edwina"
    ,
    "Edy"
    ,
    "Edyth"
    ,
    "Edythe"
    ,
    "Effie"
    ,
    "Eileen"
    ,
    "Eilis"
    ,
    "Eimile"
    ,
    "Eirena"
    ,
    "Ekaterina"
    ,
    "Elaina"
    ,
    "Elaine"
    ,
    "Elana"
    ,
    "Elane"
    ,
    "Elayne"
    ,
    "Elberta"
    ,
    "Elbertina"
    ,
    "Elbertine"
    ,
    "Eleanor"
    ,
    "Eleanora"
    ,
    "Eleanore"
    ,
    "Electra"
    ,
    "Eleen"
    ,
    "Elena"
    ,
    "Elene"
    ,
    "Eleni"
    ,
    "Elenore"
    ,
    "Eleonora"
    ,
    "Eleonore"
    ,
    "Elfie"
    ,
    "Elfreda"
    ,
    "Elfrida"
    ,
    "Elfrieda"
    ,
    "Elga"
    ,
    "Elianora"
    ,
    "Elianore"
    ,
    "Elicia"
    ,
    "Elie"
    ,
    "Elinor"
    ,
    "Elinore"
    ,
    "Elisa"
    ,
    "Elisabet"
    ,
    "Elisabeth"
    ,
    "Elisabetta"
    ,
    "Elise"
    ,
    "Elisha"
    ,
    "Elissa"
    ,
    "Elita"
    ,
    "Eliza"
    ,
    "Elizabet"
    ,
    "Elizabeth"
    ,
    "Elka"
    ,
    "Elke"
    ,
    "Ella"
    ,
    "Elladine"
    ,
    "Elle"
    ,
    "Ellen"
    ,
    "Ellene"
    ,
    "Ellette"
    ,
    "Elli"
    ,
    "Ellie"
    ,
    "Ellissa"
    ,
    "Elly"
    ,
    "Ellyn"
    ,
    "Ellynn"
    ,
    "Elmira"
    ,
    "Elna"
    ,
    "Elnora"
    ,
    "Elnore"
    ,
    "Eloisa"
    ,
    "Eloise"
    ,
    "Elonore"
    ,
    "Elora"
    ,
    "Elsa"
    ,
    "Elsbeth"
    ,
    "Else"
    ,
    "Elset"
    ,
    "Elsey"
    ,
    "Elsi"
    ,
    "Elsie"
    ,
    "Elsinore"
    ,
    "Elspeth"
    ,
    "Elsy"
    ,
    "Elva"
    ,
    "Elvera"
    ,
    "Elvina"
    ,
    "Elvira"
    ,
    "Elwira"
    ,
    "Elyn"
    ,
    "Elyse"
    ,
    "Elysee"
    ,
    "Elysha"
    ,
    "Elysia"
    ,
    "Elyssa"
    ,
    "Em"
    ,
    "Ema"
    ,
    "Emalee"
    ,
    "Emalia"
    ,
    "Emelda"
    ,
    "Emelia"
    ,
    "Emelina"
    ,
    "Emeline"
    ,
    "Emelita"
    ,
    "Emelyne"
    ,
    "Emera"
    ,
    "Emilee"
    ,
    "Emili"
    ,
    "Emilia"
    ,
    "Emilie"
    ,
    "Emiline"
    ,
    "Emily"
    ,
    "Emlyn"
    ,
    "Emlynn"
    ,
    "Emlynne"
    ,
    "Emma"
    ,
    "Emmalee"
    ,
    "Emmaline"
    ,
    "Emmalyn"
    ,
    "Emmalynn"
    ,
    "Emmalynne"
    ,
    "Emmeline"
    ,
    "Emmey"
    ,
    "Emmi"
    ,
    "Emmie"
    ,
    "Emmy"
    ,
    "Emmye"
    ,
    "Emogene"
    ,
    "Emyle"
    ,
    "Emylee"
    ,
    "Engracia"
    ,
    "Enid"
    ,
    "Enrica"
    ,
    "Enrichetta"
    ,
    "Enrika"
    ,
    "Enriqueta"
    ,
    "Eolanda"
    ,
    "Eolande"
    ,
    "Eran"
    ,
    "Erda"
    ,
    "Erena"
    ,
    "Erica"
    ,
    "Ericha"
    ,
    "Ericka"
    ,
    "Erika"
    ,
    "Erin"
    ,
    "Erina"
    ,
    "Erinn"
    ,
    "Erinna"
    ,
    "Erma"
    ,
    "Ermengarde"
    ,
    "Ermentrude"
    ,
    "Ermina"
    ,
    "Erminia"
    ,
    "Erminie"
    ,
    "Erna"
    ,
    "Ernaline"
    ,
    "Ernesta"
    ,
    "Ernestine"
    ,
    "Ertha"
    ,
    "Eryn"
    ,
    "Esma"
    ,
    "Esmaria"
    ,
    "Esme"
    ,
    "Esmeralda"
    ,
    "Essa"
    ,
    "Essie"
    ,
    "Essy"
    ,
    "Esta"
    ,
    "Estel"
    ,
    "Estele"
    ,
    "Estell"
    ,
    "Estella"
    ,
    "Estelle"
    ,
    "Ester"
    ,
    "Esther"
    ,
    "Estrella"
    ,
    "Estrellita"
    ,
    "Ethel"
    ,
    "Ethelda"
    ,
    "Ethelin"
    ,
    "Ethelind"
    ,
    "Etheline"
    ,
    "Ethelyn"
    ,
    "Ethyl"
    ,
    "Etta"
    ,
    "Etti"
    ,
    "Ettie"
    ,
    "Etty"
    ,
    "Eudora"
    ,
    "Eugenia"
    ,
    "Eugenie"
    ,
    "Eugine"
    ,
    "Eula"
    ,
    "Eulalie"
    ,
    "Eunice"
    ,
    "Euphemia"
    ,
    "Eustacia"
    ,
    "Eva"
    ,
    "Evaleen"
    ,
    "Evangelia"
    ,
    "Evangelin"
    ,
    "Evangelina"
    ,
    "Evangeline"
    ,
    "Evania"
    ,
    "Evanne"
    ,
    "Eve"
    ,
    "Eveleen"
    ,
    "Evelina"
    ,
    "Eveline"
    ,
    "Evelyn"
    ,
    "Evey"
    ,
    "Evie"
    ,
    "Evita"
    ,
    "Evonne"
    ,
    "Evvie"
    ,
    "Evvy"
    ,
    "Evy"
    ,
    "Eyde"
    ,
    "Eydie"
    ,
    "Ezmeralda"
    ,
    "Fae"
    ,
    "Faina"
    ,
    "Faith"
    ,
    "Fallon"
    ,
    "Fan"
    ,
    "Fanchette"
    ,
    "Fanchon"
    ,
    "Fancie"
    ,
    "Fancy"
    ,
    "Fanechka"
    ,
    "Fania"
    ,
    "Fanni"
    ,
    "Fannie"
    ,
    "Fanny"
    ,
    "Fanya"
    ,
    "Fara"
    ,
    "Farah"
    ,
    "Farand"
    ,
    "Farica"
    ,
    "Farra"
    ,
    "Farrah"
    ,
    "Farrand"
    ,
    "Faun"
    ,
    "Faunie"
    ,
    "Faustina"
    ,
    "Faustine"
    ,
    "Fawn"
    ,
    "Fawne"
    ,
    "Fawnia"
    ,
    "Fay"
    ,
    "Faydra"
    ,
    "Faye"
    ,
    "Fayette"
    ,
    "Fayina"
    ,
    "Fayre"
    ,
    "Fayth"
    ,
    "Faythe"
    ,
    "Federica"
    ,
    "Fedora"
    ,
    "Felecia"
    ,
    "Felicdad"
    ,
    "Felice"
    ,
    "Felicia"
    ,
    "Felicity"
    ,
    "Felicle"
    ,
    "Felipa"
    ,
    "Felisha"
    ,
    "Felita"
    ,
    "Feliza"
    ,
    "Fenelia"
    ,
    "Feodora"
    ,
    "Ferdinanda"
    ,
    "Ferdinande"
    ,
    "Fern"
    ,
    "Fernanda"
    ,
    "Fernande"
    ,
    "Fernandina"
    ,
    "Ferne"
    ,
    "Fey"
    ,
    "Fiann"
    ,
    "Fianna"
    ,
    "Fidela"
    ,
    "Fidelia"
    ,
    "Fidelity"
    ,
    "Fifi"
    ,
    "Fifine"
    ,
    "Filia"
    ,
    "Filide"
    ,
    "Filippa"
    ,
    "Fina"
    ,
    "Fiona"
    ,
    "Fionna"
    ,
    "Fionnula"
    ,
    "Fiorenze"
    ,
    "Fleur"
    ,
    "Fleurette"
    ,
    "Flo"
    ,
    "Flor"
    ,
    "Flora"
    ,
    "Florance"
    ,
    "Flore"
    ,
    "Florella"
    ,
    "Florence"
    ,
    "Florencia"
    ,
    "Florentia"
    ,
    "Florenza"
    ,
    "Florette"
    ,
    "Flori"
    ,
    "Floria"
    ,
    "Florida"
    ,
    "Florie"
    ,
    "Florina"
    ,
    "Florinda"
    ,
    "Floris"
    ,
    "Florri"
    ,
    "Florrie"
    ,
    "Florry"
    ,
    "Flory"
    ,
    "Flossi"
    ,
    "Flossie"
    ,
    "Flossy"
    ,
    "Flss"
    ,
    "Fran"
    ,
    "Francene"
    ,
    "Frances"
    ,
    "Francesca"
    ,
    "Francine"
    ,
    "Francisca"
    ,
    "Franciska"
    ,
    "Francoise"
    ,
    "Francyne"
    ,
    "Frank"
    ,
    "Frankie"
    ,
    "Franky"
    ,
    "Franni"
    ,
    "Frannie"
    ,
    "Franny"
    ,
    "Frayda"
    ,
    "Fred"
    ,
    "Freda"
    ,
    "Freddi"
    ,
    "Freddie"
    ,
    "Freddy"
    ,
    "Fredelia"
    ,
    "Frederica"
    ,
    "Fredericka"
    ,
    "Frederique"
    ,
    "Fredi"
    ,
    "Fredia"
    ,
    "Fredra"
    ,
    "Fredrika"
    ,
    "Freida"
    ,
    "Frieda"
    ,
    "Friederike"
    ,
    "Fulvia"
    ,
    "Gabbey"
    ,
    "Gabbi"
    ,
    "Gabbie"
    ,
    "Gabey"
    ,
    "Gabi"
    ,
    "Gabie"
    ,
    "Gabriel"
    ,
    "Gabriela"
    ,
    "Gabriell"
    ,
    "Gabriella"
    ,
    "Gabrielle"
    ,
    "Gabriellia"
    ,
    "Gabrila"
    ,
    "Gaby"
    ,
    "Gae"
    ,
    "Gael"
    ,
    "Gail"
    ,
    "Gale"
    ,
    "Gale"
    ,
    "Galina"
    ,
    "Garland"
    ,
    "Garnet"
    ,
    "Garnette"
    ,
    "Gates"
    ,
    "Gavra"
    ,
    "Gavrielle"
    ,
    "Gay"
    ,
    "Gaye"
    ,
    "Gayel"
    ,
    "Gayla"
    ,
    "Gayle"
    ,
    "Gayleen"
    ,
    "Gaylene"
    ,
    "Gaynor"
    ,
    "Gelya"
    ,
    "Gena"
    ,
    "Gene"
    ,
    "Geneva"
    ,
    "Genevieve"
    ,
    "Genevra"
    ,
    "Genia"
    ,
    "Genna"
    ,
    "Genni"
    ,
    "Gennie"
    ,
    "Gennifer"
    ,
    "Genny"
    ,
    "Genovera"
    ,
    "Genvieve"
    ,
    "George"
    ,
    "Georgeanna"
    ,
    "Georgeanne"
    ,
    "Georgena"
    ,
    "Georgeta"
    ,
    "Georgetta"
    ,
    "Georgette"
    ,
    "Georgia"
    ,
    "Georgiana"
    ,
    "Georgianna"
    ,
    "Georgianne"
    ,
    "Georgie"
    ,
    "Georgina"
    ,
    "Georgine"
    ,
    "Geralda"
    ,
    "Geraldine"
    ,
    "Gerda"
    ,
    "Gerhardine"
    ,
    "Geri"
    ,
    "Gerianna"
    ,
    "Gerianne"
    ,
    "Gerladina"
    ,
    "Germain"
    ,
    "Germaine"
    ,
    "Germana"
    ,
    "Gerri"
    ,
    "Gerrie"
    ,
    "Gerrilee"
    ,
    "Gerry"
    ,
    "Gert"
    ,
    "Gerta"
    ,
    "Gerti"
    ,
    "Gertie"
    ,
    "Gertrud"
    ,
    "Gertruda"
    ,
    "Gertrude"
    ,
    "Gertrudis"
    ,
    "Gerty"
    ,
    "Giacinta"
    ,
    "Giana"
    ,
    "Gianina"
    ,
    "Gianna"
    ,
    "Gigi"
    ,
    "Gilberta"
    ,
    "Gilberte"
    ,
    "Gilbertina"
    ,
    "Gilbertine"
    ,
    "Gilda"
    ,
    "Gilemette"
    ,
    "Gill"
    ,
    "Gillan"
    ,
    "Gilli"
    ,
    "Gillian"
    ,
    "Gillie"
    ,
    "Gilligan"
    ,
    "Gilly"
    ,
    "Gina"
    ,
    "Ginelle"
    ,
    "Ginevra"
    ,
    "Ginger"
    ,
    "Ginni"
    ,
    "Ginnie"
    ,
    "Ginnifer"
    ,
    "Ginny"
    ,
    "Giorgia"
    ,
    "Giovanna"
    ,
    "Gipsy"
    ,
    "Giralda"
    ,
    "Gisela"
    ,
    "Gisele"
    ,
    "Gisella"
    ,
    "Giselle"
    ,
    "Giuditta"
    ,
    "Giulia"
    ,
    "Giulietta"
    ,
    "Giustina"
    ,
    "Gizela"
    ,
    "Glad"
    ,
    "Gladi"
    ,
    "Gladys"
    ,
    "Gleda"
    ,
    "Glen"
    ,
    "Glenda"
    ,
    "Glenine"
    ,
    "Glenn"
    ,
    "Glenna"
    ,
    "Glennie"
    ,
    "Glennis"
    ,
    "Glori"
    ,
    "Gloria"
    ,
    "Gloriana"
    ,
    "Gloriane"
    ,
    "Glory"
    ,
    "Glyn"
    ,
    "Glynda"
    ,
    "Glynis"
    ,
    "Glynnis"
    ,
    "Gnni"
    ,
    "Godiva"
    ,
    "Golda"
    ,
    "Goldarina"
    ,
    "Goldi"
    ,
    "Goldia"
    ,
    "Goldie"
    ,
    "Goldina"
    ,
    "Goldy"
    ,
    "Grace"
    ,
    "Gracia"
    ,
    "Gracie"
    ,
    "Grata"
    ,
    "Gratia"
    ,
    "Gratiana"
    ,
    "Gray"
    ,
    "Grayce"
    ,
    "Grazia"
    ,
    "Greer"
    ,
    "Greta"
    ,
    "Gretal"
    ,
    "Gretchen"
    ,
    "Grete"
    ,
    "Gretel"
    ,
    "Grethel"
    ,
    "Gretna"
    ,
    "Gretta"
    ,
    "Grier"
    ,
    "Griselda"
    ,
    "Grissel"
    ,
    "Guendolen"
    ,
    "Guenevere"
    ,
    "Guenna"
    ,
    "Guglielma"
    ,
    "Gui"
    ,
    "Guillema"
    ,
    "Guillemette"
    ,
    "Guinevere"
    ,
    "Guinna"
    ,
    "Gunilla"
    ,
    "Gus"
    ,
    "Gusella"
    ,
    "Gussi"
    ,
    "Gussie"
    ,
    "Gussy"
    ,
    "Gusta"
    ,
    "Gusti"
    ,
    "Gustie"
    ,
    "Gusty"
    ,
    "Gwen"
    ,
    "Gwendolen"
    ,
    "Gwendolin"
    ,
    "Gwendolyn"
    ,
    "Gweneth"
    ,
    "Gwenette"
    ,
    "Gwenneth"
    ,
    "Gwenni"
    ,
    "Gwennie"
    ,
    "Gwenny"
    ,
    "Gwenora"
    ,
    "Gwenore"
    ,
    "Gwyn"
    ,
    "Gwyneth"
    ,
    "Gwynne"
    ,
    "Gypsy"
    ,
    "Hadria"
    ,
    "Hailee"
    ,
    "Haily"
    ,
    "Haleigh"
    ,
    "Halette"
    ,
    "Haley"
    ,
    "Hali"
    ,
    "Halie"
    ,
    "Halimeda"
    ,
    "Halley"
    ,
    "Halli"
    ,
    "Hallie"
    ,
    "Hally"
    ,
    "Hana"
    ,
    "Hanna"
    ,
    "Hannah"
    ,
    "Hanni"
    ,
    "Hannie"
    ,
    "Hannis"
    ,
    "Hanny"
    ,
    "Happy"
    ,
    "Harlene"
    ,
    "Harley"
    ,
    "Harli"
    ,
    "Harlie"
    ,
    "Harmonia"
    ,
    "Harmonie"
    ,
    "Harmony"
    ,
    "Harri"
    ,
    "Harrie"
    ,
    "Harriet"
    ,
    "Harriett"
    ,
    "Harrietta"
    ,
    "Harriette"
    ,
    "Harriot"
    ,
    "Harriott"
    ,
    "Hatti"
    ,
    "Hattie"
    ,
    "Hatty"
    ,
    "Hayley"
    ,
    "Hazel"
    ,
    "Heath"
    ,
    "Heather"
    ,
    "Heda"
    ,
    "Hedda"
    ,
    "Heddi"
    ,
    "Heddie"
    ,
    "Hedi"
    ,
    "Hedvig"
    ,
    "Hedvige"
    ,
    "Hedwig"
    ,
    "Hedwiga"
    ,
    "Hedy"
    ,
    "Heida"
    ,
    "Heidi"
    ,
    "Heidie"
    ,
    "Helaina"
    ,
    "Helaine"
    ,
    "Helen"
    ,
    "Helen-Elizabeth"
    ,
    "Helena"
    ,
    "Helene"
    ,
    "Helenka"
    ,
    "Helga"
    ,
    "Helge"
    ,
    "Helli"
    ,
    "Heloise"
    ,
    "Helsa"
    ,
    "Helyn"
    ,
    "Hendrika"
    ,
    "Henka"
    ,
    "Henrie"
    ,
    "Henrieta"
    ,
    "Henrietta"
    ,
    "Henriette"
    ,
    "Henryetta"
    ,
    "Hephzibah"
    ,
    "Hermia"
    ,
    "Hermina"
    ,
    "Hermine"
    ,
    "Herminia"
    ,
    "Hermione"
    ,
    "Herta"
    ,
    "Hertha"
    ,
    "Hester"
    ,
    "Hesther"
    ,
    "Hestia"
    ,
    "Hetti"
    ,
    "Hettie"
    ,
    "Hetty"
    ,
    "Hilary"
    ,
    "Hilda"
    ,
    "Hildagard"
    ,
    "Hildagarde"
    ,
    "Hilde"
    ,
    "Hildegaard"
    ,
    "Hildegarde"
    ,
    "Hildy"
    ,
    "Hillary"
    ,
    "Hilliary"
    ,
    "Hinda"
    ,
    "Holli"
    ,
    "Hollie"
    ,
    "Holly"
    ,
    "Holly-Anne"
    ,
    "Hollyanne"
    ,
    "Honey"
    ,
    "Honor"
    ,
    "Honoria"
    ,
    "Hope"
    ,
    "Horatia"
    ,
    "Hortense"
    ,
    "Hortensia"
    ,
    "Hulda"
    ,
    "Hyacinth"
    ,
    "Hyacintha"
    ,
    "Hyacinthe"
    ,
    "Hyacinthia"
    ,
    "Hyacinthie"
    ,
    "Hynda"
    ,
    "Ianthe"
    ,
    "Ibbie"
    ,
    "Ibby"
    ,
    "Ida"
    ,
    "Idalia"
    ,
    "Idalina"
    ,
    "Idaline"
    ,
    "Idell"
    ,
    "Idelle"
    ,
    "Idette"
    ,
    "Ileana"
    ,
    "Ileane"
    ,
    "Ilene"
    ,
    "Ilise"
    ,
    "Ilka"
    ,
    "Illa"
    ,
    "Ilsa"
    ,
    "Ilse"
    ,
    "Ilysa"
    ,
    "Ilyse"
    ,
    "Ilyssa"
    ,
    "Imelda"
    ,
    "Imogen"
    ,
    "Imogene"
    ,
    "Imojean"
    ,
    "Ina"
    ,
    "Indira"
    ,
    "Ines"
    ,
    "Inesita"
    ,
    "Inessa"
    ,
    "Inez"
    ,
    "Inga"
    ,
    "Ingaberg"
    ,
    "Ingaborg"
    ,
    "Inge"
    ,
    "Ingeberg"
    ,
    "Ingeborg"
    ,
    "Inger"
    ,
    "Ingrid"
    ,
    "Ingunna"
    ,
    "Inna"
    ,
    "Iolande"
    ,
    "Iolanthe"
    ,
    "Iona"
    ,
    "Iormina"
    ,
    "Ira"
    ,
    "Irena"
    ,
    "Irene"
    ,
    "Irina"
    ,
    "Iris"
    ,
    "Irita"
    ,
    "Irma"
    ,
    "Isa"
    ,
    "Isabel"
    ,
    "Isabelita"
    ,
    "Isabella"
    ,
    "Isabelle"
    ,
    "Isadora"
    ,
    "Isahella"
    ,
    "Iseabal"
    ,
    "Isidora"
    ,
    "Isis"
    ,
    "Isobel"
    ,
    "Issi"
    ,
    "Issie"
    ,
    "Issy"
    ,
    "Ivett"
    ,
    "Ivette"
    ,
    "Ivie"
    ,
    "Ivonne"
    ,
    "Ivory"
    ,
    "Ivy"
    ,
    "Izabel"
    ,
    "Jacenta"
    ,
    "Jacinda"
    ,
    "Jacinta"
    ,
    "Jacintha"
    ,
    "Jacinthe"
    ,
    "Jackelyn"
    ,
    "Jacki"
    ,
    "Jackie"
    ,
    "Jacklin"
    ,
    "Jacklyn"
    ,
    "Jackquelin"
    ,
    "Jackqueline"
    ,
    "Jacky"
    ,
    "Jaclin"
    ,
    "Jaclyn"
    ,
    "Jacquelin"
    ,
    "Jacqueline"
    ,
    "Jacquelyn"
    ,
    "Jacquelynn"
    ,
    "Jacquenetta"
    ,
    "Jacquenette"
    ,
    "Jacquetta"
    ,
    "Jacquette"
    ,
    "Jacqui"
    ,
    "Jacquie"
    ,
    "Jacynth"
    ,
    "Jada"
    ,
    "Jade"
    ,
    "Jaime"
    ,
    "Jaimie"
    ,
    "Jaine"
    ,
    "Jami"
    ,
    "Jamie"
    ,
    "Jamima"
    ,
    "Jammie"
    ,
    "Jan"
    ,
    "Jana"
    ,
    "Janaya"
    ,
    "Janaye"
    ,
    "Jandy"
    ,
    "Jane"
    ,
    "Janean"
    ,
    "Janeczka"
    ,
    "Janeen"
    ,
    "Janel"
    ,
    "Janela"
    ,
    "Janella"
    ,
    "Janelle"
    ,
    "Janene"
    ,
    "Janenna"
    ,
    "Janessa"
    ,
    "Janet"
    ,
    "Janeta"
    ,
    "Janetta"
    ,
    "Janette"
    ,
    "Janeva"
    ,
    "Janey"
    ,
    "Jania"
    ,
    "Janice"
    ,
    "Janie"
    ,
    "Janifer"
    ,
    "Janina"
    ,
    "Janine"
    ,
    "Janis"
    ,
    "Janith"
    ,
    "Janka"
    ,
    "Janna"
    ,
    "Jannel"
    ,
    "Jannelle"
    ,
    "Janot"
    ,
    "Jany"
    ,
    "Jaquelin"
    ,
    "Jaquelyn"
    ,
    "Jaquenetta"
    ,
    "Jaquenette"
    ,
    "Jaquith"
    ,
    "Jasmin"
    ,
    "Jasmina"
    ,
    "Jasmine"
    ,
    "Jayme"
    ,
    "Jaymee"
    ,
    "Jayne"
    ,
    "Jaynell"
    ,
    "Jazmin"
    ,
    "Jean"
    ,
    "Jeana"
    ,
    "Jeane"
    ,
    "Jeanelle"
    ,
    "Jeanette"
    ,
    "Jeanie"
    ,
    "Jeanine"
    ,
    "Jeanna"
    ,
    "Jeanne"
    ,
    "Jeannette"
    ,
    "Jeannie"
    ,
    "Jeannine"
    ,
    "Jehanna"
    ,
    "Jelene"
    ,
    "Jemie"
    ,
    "Jemima"
    ,
    "Jemimah"
    ,
    "Jemmie"
    ,
    "Jemmy"
    ,
    "Jen"
    ,
    "Jena"
    ,
    "Jenda"
    ,
    "Jenelle"
    ,
    "Jeni"
    ,
    "Jenica"
    ,
    "Jeniece"
    ,
    "Jenifer"
    ,
    "Jeniffer"
    ,
    "Jenilee"
    ,
    "Jenine"
    ,
    "Jenn"
    ,
    "Jenna"
    ,
    "Jennee"
    ,
    "Jennette"
    ,
    "Jenni"
    ,
    "Jennica"
    ,
    "Jennie"
    ,
    "Jennifer"
    ,
    "Jennilee"
    ,
    "Jennine"
    ,
    "Jenny"
    ,
    "Jeralee"
    ,
    "Jere"
    ,
    "Jeri"
    ,
    "Jermaine"
    ,
    "Jerrie"
    ,
    "Jerrilee"
    ,
    "Jerrilyn"
    ,
    "Jerrine"
    ,
    "Jerry"
    ,
    "Jerrylee"
    ,
    "Jess"
    ,
    "Jessa"
    ,
    "Jessalin"
    ,
    "Jessalyn"
    ,
    "Jessamine"
    ,
    "Jessamyn"
    ,
    "Jesse"
    ,
    "Jesselyn"
    ,
    "Jessi"
    ,
    "Jessica"
    ,
    "Jessie"
    ,
    "Jessika"
    ,
    "Jessy"
    ,
    "Jewel"
    ,
    "Jewell"
    ,
    "Jewelle"
    ,
    "Jill"
    ,
    "Jillana"
    ,
    "Jillane"
    ,
    "Jillayne"
    ,
    "Jilleen"
    ,
    "Jillene"
    ,
    "Jilli"
    ,
    "Jillian"
    ,
    "Jillie"
    ,
    "Jilly"
    ,
    "Jinny"
    ,
    "Jo"
    ,
    "Jo Ann"
    ,
    "Jo-Ann"
    ,
    "Jo-Anne"
    ,
    "Joan"
    ,
    "Joana"
    ,
    "Joane"
    ,
    "Joanie"
    ,
    "Joann"
    ,
    "Joanna"
    ,
    "Joanne"
    ,
    "Joannes"
    ,
    "Jobey"
    ,
    "Jobi"
    ,
    "Jobie"
    ,
    "Jobina"
    ,
    "Joby"
    ,
    "Jobye"
    ,
    "Jobyna"
    ,
    "Jocelin"
    ,
    "Joceline"
    ,
    "Jocelyn"
    ,
    "Jocelyne"
    ,
    "Jodee"
    ,
    "Jodi"
    ,
    "Jodie"
    ,
    "Jody"
    ,
    "Joeann"
    ,
    "Joela"
    ,
    "Joelie"
    ,
    "Joell"
    ,
    "Joella"
    ,
    "Joelle"
    ,
    "Joellen"
    ,
    "Joelly"
    ,
    "Joellyn"
    ,
    "Joelynn"
    ,
    "Joete"
    ,
    "Joey"
    ,
    "Johanna"
    ,
    "Johannah"
    ,
    "Johna"
    ,
    "Johnath"
    ,
    "Johnette"
    ,
    "Johnna"
    ,
    "Joice"
    ,
    "Jojo"
    ,
    "Jolee"
    ,
    "Joleen"
    ,
    "Jolene"
    ,
    "Joletta"
    ,
    "Joli"
    ,
    "Jolie"
    ,
    "Joline"
    ,
    "Joly"
    ,
    "Jolyn"
    ,
    "Jolynn"
    ,
    "Jonell"
    ,
    "Joni"
    ,
    "Jonie"
    ,
    "Jonis"
    ,
    "Jordain"
    ,
    "Jordan"
    ,
    "Jordana"
    ,
    "Jordanna"
    ,
    "Jorey"
    ,
    "Jori"
    ,
    "Jorie"
    ,
    "Jorrie"
    ,
    "Jorry"
    ,
    "Joscelin"
    ,
    "Josee"
    ,
    "Josefa"
    ,
    "Josefina"
    ,
    "Josepha"
    ,
    "Josephina"
    ,
    "Josephine"
    ,
    "Josey"
    ,
    "Josi"
    ,
    "Josie"
    ,
    "Josselyn"
    ,
    "Josy"
    ,
    "Jourdan"
    ,
    "Joy"
    ,
    "Joya"
    ,
    "Joyan"
    ,
    "Joyann"
    ,
    "Joyce"
    ,
    "Joycelin"
    ,
    "Joye"
    ,
    "Jsandye"
    ,
    "Juana"
    ,
    "Juanita"
    ,
    "Judi"
    ,
    "Judie"
    ,
    "Judith"
    ,
    "Juditha"
    ,
    "Judy"
    ,
    "Judye"
    ,
    "Juieta"
    ,
    "Julee"
    ,
    "Juli"
    ,
    "Julia"
    ,
    "Juliana"
    ,
    "Juliane"
    ,
    "Juliann"
    ,
    "Julianna"
    ,
    "Julianne"
    ,
    "Julie"
    ,
    "Julienne"
    ,
    "Juliet"
    ,
    "Julieta"
    ,
    "Julietta"
    ,
    "Juliette"
    ,
    "Julina"
    ,
    "Juline"
    ,
    "Julissa"
    ,
    "Julita"
    ,
    "June"
    ,
    "Junette"
    ,
    "Junia"
    ,
    "Junie"
    ,
    "Junina"
    ,
    "Justina"
    ,
    "Justine"
    ,
    "Justinn"
    ,
    "Jyoti"
    ,
    "Kacey"
    ,
    "Kacie"
    ,
    "Kacy"
    ,
    "Kaela"
    ,
    "Kai"
    ,
    "Kaia"
    ,
    "Kaila"
    ,
    "Kaile"
    ,
    "Kailey"
    ,
    "Kaitlin"
    ,
    "Kaitlyn"
    ,
    "Kaitlynn"
    ,
    "Kaja"
    ,
    "Kakalina"
    ,
    "Kala"
    ,
    "Kaleena"
    ,
    "Kali"
    ,
    "Kalie"
    ,
    "Kalila"
    ,
    "Kalina"
    ,
    "Kalinda"
    ,
    "Kalindi"
    ,
    "Kalli"
    ,
    "Kally"
    ,
    "Kameko"
    ,
    "Kamila"
    ,
    "Kamilah"
    ,
    "Kamillah"
    ,
    "Kandace"
    ,
    "Kandy"
    ,
    "Kania"
    ,
    "Kanya"
    ,
    "Kara"
    ,
    "Kara-Lynn"
    ,
    "Karalee"
    ,
    "Karalynn"
    ,
    "Kare"
    ,
    "Karee"
    ,
    "Karel"
    ,
    "Karen"
    ,
    "Karena"
    ,
    "Kari"
    ,
    "Karia"
    ,
    "Karie"
    ,
    "Karil"
    ,
    "Karilynn"
    ,
    "Karin"
    ,
    "Karina"
    ,
    "Karine"
    ,
    "Kariotta"
    ,
    "Karisa"
    ,
    "Karissa"
    ,
    "Karita"
    ,
    "Karla"
    ,
    "Karlee"
    ,
    "Karleen"
    ,
    "Karlen"
    ,
    "Karlene"
    ,
    "Karlie"
    ,
    "Karlotta"
    ,
    "Karlotte"
    ,
    "Karly"
    ,
    "Karlyn"
    ,
    "Karmen"
    ,
    "Karna"
    ,
    "Karol"
    ,
    "Karola"
    ,
    "Karole"
    ,
    "Karolina"
    ,
    "Karoline"
    ,
    "Karoly"
    ,
    "Karon"
    ,
    "Karrah"
    ,
    "Karrie"
    ,
    "Karry"
    ,
    "Kary"
    ,
    "Karyl"
    ,
    "Karylin"
    ,
    "Karyn"
    ,
    "Kasey"
    ,
    "Kass"
    ,
    "Kassandra"
    ,
    "Kassey"
    ,
    "Kassi"
    ,
    "Kassia"
    ,
    "Kassie"
    ,
    "Kat"
    ,
    "Kata"
    ,
    "Katalin"
    ,
    "Kate"
    ,
    "Katee"
    ,
    "Katerina"
    ,
    "Katerine"
    ,
    "Katey"
    ,
    "Kath"
    ,
    "Katha"
    ,
    "Katharina"
    ,
    "Katharine"
    ,
    "Katharyn"
    ,
    "Kathe"
    ,
    "Katherina"
    ,
    "Katherine"
    ,
    "Katheryn"
    ,
    "Kathi"
    ,
    "Kathie"
    ,
    "Kathleen"
    ,
    "Kathlin"
    ,
    "Kathrine"
    ,
    "Kathryn"
    ,
    "Kathryne"
    ,
    "Kathy"
    ,
    "Kathye"
    ,
    "Kati"
    ,
    "Katie"
    ,
    "Katina"
    ,
    "Katine"
    ,
    "Katinka"
    ,
    "Katleen"
    ,
    "Katlin"
    ,
    "Katrina"
    ,
    "Katrine"
    ,
    "Katrinka"
    ,
    "Katti"
    ,
    "Kattie"
    ,
    "Katuscha"
    ,
    "Katusha"
    ,
    "Katy"
    ,
    "Katya"
    ,
    "Kay"
    ,
    "Kaycee"
    ,
    "Kaye"
    ,
    "Kayla"
    ,
    "Kayle"
    ,
    "Kaylee"
    ,
    "Kayley"
    ,
    "Kaylil"
    ,
    "Kaylyn"
    ,
    "Keeley"
    ,
    "Keelia"
    ,
    "Keely"
    ,
    "Kelcey"
    ,
    "Kelci"
    ,
    "Kelcie"
    ,
    "Kelcy"
    ,
    "Kelila"
    ,
    "Kellen"
    ,
    "Kelley"
    ,
    "Kelli"
    ,
    "Kellia"
    ,
    "Kellie"
    ,
    "Kellina"
    ,
    "Kellsie"
    ,
    "Kelly"
    ,
    "Kellyann"
    ,
    "Kelsey"
    ,
    "Kelsi"
    ,
    "Kelsy"
    ,
    "Kendra"
    ,
    "Kendre"
    ,
    "Kenna"
    ,
    "Keri"
    ,
    "Keriann"
    ,
    "Kerianne"
    ,
    "Kerri"
    ,
    "Kerrie"
    ,
    "Kerrill"
    ,
    "Kerrin"
    ,
    "Kerry"
    ,
    "Kerstin"
    ,
    "Kesley"
    ,
    "Keslie"
    ,
    "Kessia"
    ,
    "Kessiah"
    ,
    "Ketti"
    ,
    "Kettie"
    ,
    "Ketty"
    ,
    "Kevina"
    ,
    "Kevyn"
    ,
    "Ki"
    ,
    "Kiah"
    ,
    "Kial"
    ,
    "Kiele"
    ,
    "Kiersten"
    ,
    "Kikelia"
    ,
    "Kiley"
    ,
    "Kim"
    ,
    "Kimberlee"
    ,
    "Kimberley"
    ,
    "Kimberli"
    ,
    "Kimberly"
    ,
    "Kimberlyn"
    ,
    "Kimbra"
    ,
    "Kimmi"
    ,
    "Kimmie"
    ,
    "Kimmy"
    ,
    "Kinna"
    ,
    "Kip"
    ,
    "Kipp"
    ,
    "Kippie"
    ,
    "Kippy"
    ,
    "Kira"
    ,
    "Kirbee"
    ,
    "Kirbie"
    ,
    "Kirby"
    ,
    "Kiri"
    ,
    "Kirsten"
    ,
    "Kirsteni"
    ,
    "Kirsti"
    ,
    "Kirstin"
    ,
    "Kirstyn"
    ,
    "Kissee"
    ,
    "Kissiah"
    ,
    "Kissie"
    ,
    "Kit"
    ,
    "Kitti"
    ,
    "Kittie"
    ,
    "Kitty"
    ,
    "Kizzee"
    ,
    "Kizzie"
    ,
    "Klara"
    ,
    "Klarika"
    ,
    "Klarrisa"
    ,
    "Konstance"
    ,
    "Konstanze"
    ,
    "Koo"
    ,
    "Kora"
    ,
    "Koral"
    ,
    "Koralle"
    ,
    "Kordula"
    ,
    "Kore"
    ,
    "Korella"
    ,
    "Koren"
    ,
    "Koressa"
    ,
    "Kori"
    ,
    "Korie"
    ,
    "Korney"
    ,
    "Korrie"
    ,
    "Korry"
    ,
    "Kris"
    ,
    "Krissie"
    ,
    "Krissy"
    ,
    "Krista"
    ,
    "Kristal"
    ,
    "Kristan"
    ,
    "Kriste"
    ,
    "Kristel"
    ,
    "Kristen"
    ,
    "Kristi"
    ,
    "Kristien"
    ,
    "Kristin"
    ,
    "Kristina"
    ,
    "Kristine"
    ,
    "Kristy"
    ,
    "Kristyn"
    ,
    "Krysta"
    ,
    "Krystal"
    ,
    "Krystalle"
    ,
    "Krystle"
    ,
    "Krystyna"
    ,
    "Kyla"
    ,
    "Kyle"
    ,
    "Kylen"
    ,
    "Kylie"
    ,
    "Kylila"
    ,
    "Kylynn"
    ,
    "Kym"
    ,
    "Kynthia"
    ,
    "Kyrstin"
    ,
    "La Verne"
    ,
    "Lacee"
    ,
    "Lacey"
    ,
    "Lacie"
    ,
    "Lacy"
    ,
    "Ladonna"
    ,
    "Laetitia"
    ,
    "Laina"
    ,
    "Lainey"
    ,
    "Lana"
    ,
    "Lanae"
    ,
    "Lane"
    ,
    "Lanette"
    ,
    "Laney"
    ,
    "Lani"
    ,
    "Lanie"
    ,
    "Lanita"
    ,
    "Lanna"
    ,
    "Lanni"
    ,
    "Lanny"
    ,
    "Lara"
    ,
    "Laraine"
    ,
    "Lari"
    ,
    "Larina"
    ,
    "Larine"
    ,
    "Larisa"
    ,
    "Larissa"
    ,
    "Lark"
    ,
    "Laryssa"
    ,
    "Latashia"
    ,
    "Latia"
    ,
    "Latisha"
    ,
    "Latrena"
    ,
    "Latrina"
    ,
    "Laura"
    ,
    "Lauraine"
    ,
    "Laural"
    ,
    "Lauralee"
    ,
    "Laure"
    ,
    "Lauree"
    ,
    "Laureen"
    ,
    "Laurel"
    ,
    "Laurella"
    ,
    "Lauren"
    ,
    "Laurena"
    ,
    "Laurene"
    ,
    "Lauretta"
    ,
    "Laurette"
    ,
    "Lauri"
    ,
    "Laurianne"
    ,
    "Laurice"
    ,
    "Laurie"
    ,
    "Lauryn"
    ,
    "Lavena"
    ,
    "Laverna"
    ,
    "Laverne"
    ,
    "Lavina"
    ,
    "Lavinia"
    ,
    "Lavinie"
    ,
    "Layla"
    ,
    "Layne"
    ,
    "Layney"
    ,
    "Lea"
    ,
    "Leah"
    ,
    "Leandra"
    ,
    "Leann"
    ,
    "Leanna"
    ,
    "Leanor"
    ,
    "Leanora"
    ,
    "Lebbie"
    ,
    "Leda"
    ,
    "Lee"
    ,
    "Leeann"
    ,
    "Leeanne"
    ,
    "Leela"
    ,
    "Leelah"
    ,
    "Leena"
    ,
    "Leesa"
    ,
    "Leese"
    ,
    "Legra"
    ,
    "Leia"
    ,
    "Leigh"
    ,
    "Leigha"
    ,
    "Leila"
    ,
    "Leilah"
    ,
    "Leisha"
    ,
    "Lela"
    ,
    "Lelah"
    ,
    "Leland"
    ,
    "Lelia"
    ,
    "Lena"
    ,
    "Lenee"
    ,
    "Lenette"
    ,
    "Lenka"
    ,
    "Lenna"
    ,
    "Lenora"
    ,
    "Lenore"
    ,
    "Leodora"
    ,
    "Leoine"
    ,
    "Leola"
    ,
    "Leoline"
    ,
    "Leona"
    ,
    "Leonanie"
    ,
    "Leone"
    ,
    "Leonelle"
    ,
    "Leonie"
    ,
    "Leonora"
    ,
    "Leonore"
    ,
    "Leontine"
    ,
    "Leontyne"
    ,
    "Leora"
    ,
    "Leshia"
    ,
    "Lesley"
    ,
    "Lesli"
    ,
    "Leslie"
    ,
    "Lesly"
    ,
    "Lesya"
    ,
    "Leta"
    ,
    "Lethia"
    ,
    "Leticia"
    ,
    "Letisha"
    ,
    "Letitia"
    ,
    "Letizia"
    ,
    "Letta"
    ,
    "Letti"
    ,
    "Lettie"
    ,
    "Letty"
    ,
    "Lexi"
    ,
    "Lexie"
    ,
    "Lexine"
    ,
    "Lexis"
    ,
    "Lexy"
    ,
    "Leyla"
    ,
    "Lezlie"
    ,
    "Lia"
    ,
    "Lian"
    ,
    "Liana"
    ,
    "Liane"
    ,
    "Lianna"
    ,
    "Lianne"
    ,
    "Lib"
    ,
    "Libbey"
    ,
    "Libbi"
    ,
    "Libbie"
    ,
    "Libby"
    ,
    "Licha"
    ,
    "Lida"
    ,
    "Lidia"
    ,
    "Liesa"
    ,
    "Lil"
    ,
    "Lila"
    ,
    "Lilah"
    ,
    "Lilas"
    ,
    "Lilia"
    ,
    "Lilian"
    ,
    "Liliane"
    ,
    "Lilias"
    ,
    "Lilith"
    ,
    "Lilla"
    ,
    "Lilli"
    ,
    "Lillian"
    ,
    "Lillis"
    ,
    "Lilllie"
    ,
    "Lilly"
    ,
    "Lily"
    ,
    "Lilyan"
    ,
    "Lin"
    ,
    "Lina"
    ,
    "Lind"
    ,
    "Linda"
    ,
    "Lindi"
    ,
    "Lindie"
    ,
    "Lindsay"
    ,
    "Lindsey"
    ,
    "Lindsy"
    ,
    "Lindy"
    ,
    "Linea"
    ,
    "Linell"
    ,
    "Linet"
    ,
    "Linette"
    ,
    "Linn"
    ,
    "Linnea"
    ,
    "Linnell"
    ,
    "Linnet"
    ,
    "Linnie"
    ,
    "Linzy"
    ,
    "Lira"
    ,
    "Lisa"
    ,
    "Lisabeth"
    ,
    "Lisbeth"
    ,
    "Lise"
    ,
    "Lisetta"
    ,
    "Lisette"
    ,
    "Lisha"
    ,
    "Lishe"
    ,
    "Lissa"
    ,
    "Lissi"
    ,
    "Lissie"
    ,
    "Lissy"
    ,
    "Lita"
    ,
    "Liuka"
    ,
    "Liv"
    ,
    "Liva"
    ,
    "Livia"
    ,
    "Livvie"
    ,
    "Livvy"
    ,
    "Livvyy"
    ,
    "Livy"
    ,
    "Liz"
    ,
    "Liza"
    ,
    "Lizabeth"
    ,
    "Lizbeth"
    ,
    "Lizette"
    ,
    "Lizzie"
    ,
    "Lizzy"
    ,
    "Loella"
    ,
    "Lois"
    ,
    "Loise"
    ,
    "Lola"
    ,
    "Loleta"
    ,
    "Lolita"
    ,
    "Lolly"
    ,
    "Lona"
    ,
    "Lonee"
    ,
    "Loni"
    ,
    "Lonna"
    ,
    "Lonni"
    ,
    "Lonnie"
    ,
    "Lora"
    ,
    "Lorain"
    ,
    "Loraine"
    ,
    "Loralee"
    ,
    "Loralie"
    ,
    "Loralyn"
    ,
    "Loree"
    ,
    "Loreen"
    ,
    "Lorelei"
    ,
    "Lorelle"
    ,
    "Loren"
    ,
    "Lorena"
    ,
    "Lorene"
    ,
    "Lorenza"
    ,
    "Loretta"
    ,
    "Lorette"
    ,
    "Lori"
    ,
    "Loria"
    ,
    "Lorianna"
    ,
    "Lorianne"
    ,
    "Lorie"
    ,
    "Lorilee"
    ,
    "Lorilyn"
    ,
    "Lorinda"
    ,
    "Lorine"
    ,
    "Lorita"
    ,
    "Lorna"
    ,
    "Lorne"
    ,
    "Lorraine"
    ,
    "Lorrayne"
    ,
    "Lorri"
    ,
    "Lorrie"
    ,
    "Lorrin"
    ,
    "Lorry"
    ,
    "Lory"
    ,
    "Lotta"
    ,
    "Lotte"
    ,
    "Lotti"
    ,
    "Lottie"
    ,
    "Lotty"
    ,
    "Lou"
    ,
    "Louella"
    ,
    "Louisa"
    ,
    "Louise"
    ,
    "Louisette"
    ,
    "Loutitia"
    ,
    "Lu"
    ,
    "Luce"
    ,
    "Luci"
    ,
    "Lucia"
    ,
    "Luciana"
    ,
    "Lucie"
    ,
    "Lucienne"
    ,
    "Lucila"
    ,
    "Lucilia"
    ,
    "Lucille"
    ,
    "Lucina"
    ,
    "Lucinda"
    ,
    "Lucine"
    ,
    "Lucita"
    ,
    "Lucky"
    ,
    "Lucretia"
    ,
    "Lucy"
    ,
    "Ludovika"
    ,
    "Luella"
    ,
    "Luelle"
    ,
    "Luisa"
    ,
    "Luise"
    ,
    "Lula"
    ,
    "Lulita"
    ,
    "Lulu"
    ,
    "Lura"
    ,
    "Lurette"
    ,
    "Lurleen"
    ,
    "Lurlene"
    ,
    "Lurline"
    ,
    "Lusa"
    ,
    "Luz"
    ,
    "Lyda"
    ,
    "Lydia"
    ,
    "Lydie"
    ,
    "Lyn"
    ,
    "Lynda"
    ,
    "Lynde"
    ,
    "Lyndel"
    ,
    "Lyndell"
    ,
    "Lyndsay"
    ,
    "Lyndsey"
    ,
    "Lyndsie"
    ,
    "Lyndy"
    ,
    "Lynea"
    ,
    "Lynelle"
    ,
    "Lynett"
    ,
    "Lynette"
    ,
    "Lynn"
    ,
    "Lynna"
    ,
    "Lynne"
    ,
    "Lynnea"
    ,
    "Lynnell"
    ,
    "Lynnelle"
    ,
    "Lynnet"
    ,
    "Lynnett"
    ,
    "Lynnette"
    ,
    "Lynsey"
    ,
    "Lyssa"
    ,
    "Mab"
    ,
    "Mabel"
    ,
    "Mabelle"
    ,
    "Mable"
    ,
    "Mada"
    ,
    "Madalena"
    ,
    "Madalyn"
    ,
    "Maddalena"
    ,
    "Maddi"
    ,
    "Maddie"
    ,
    "Maddy"
    ,
    "Madel"
    ,
    "Madelaine"
    ,
    "Madeleine"
    ,
    "Madelena"
    ,
    "Madelene"
    ,
    "Madelin"
    ,
    "Madelina"
    ,
    "Madeline"
    ,
    "Madella"
    ,
    "Madelle"
    ,
    "Madelon"
    ,
    "Madelyn"
    ,
    "Madge"
    ,
    "Madlen"
    ,
    "Madlin"
    ,
    "Madonna"
    ,
    "Mady"
    ,
    "Mae"
    ,
    "Maegan"
    ,
    "Mag"
    ,
    "Magda"
    ,
    "Magdaia"
    ,
    "Magdalen"
    ,
    "Magdalena"
    ,
    "Magdalene"
    ,
    "Maggee"
    ,
    "Maggi"
    ,
    "Maggie"
    ,
    "Maggy"
    ,
    "Mahala"
    ,
    "Mahalia"
    ,
    "Maia"
    ,
    "Maible"
    ,
    "Maiga"
    ,
    "Maighdiln"
    ,
    "Mair"
    ,
    "Maire"
    ,
    "Maisey"
    ,
    "Maisie"
    ,
    "Maitilde"
    ,
    "Mala"
    ,
    "Malanie"
    ,
    "Malena"
    ,
    "Malia"
    ,
    "Malina"
    ,
    "Malinda"
    ,
    "Malinde"
    ,
    "Malissa"
    ,
    "Malissia"
    ,
    "Mallissa"
    ,
    "Mallorie"
    ,
    "Mallory"
    ,
    "Malorie"
    ,
    "Malory"
    ,
    "Malva"
    ,
    "Malvina"
    ,
    "Malynda"
    ,
    "Mame"
    ,
    "Mamie"
    ,
    "Manda"
    ,
    "Mandi"
    ,
    "Mandie"
    ,
    "Mandy"
    ,
    "Manon"
    ,
    "Manya"
    ,
    "Mara"
    ,
    "Marabel"
    ,
    "Marcela"
    ,
    "Marcelia"
    ,
    "Marcella"
    ,
    "Marcelle"
    ,
    "Marcellina"
    ,
    "Marcelline"
    ,
    "Marchelle"
    ,
    "Marci"
    ,
    "Marcia"
    ,
    "Marcie"
    ,
    "Marcile"
    ,
    "Marcille"
    ,
    "Marcy"
    ,
    "Mareah"
    ,
    "Maren"
    ,
    "Marena"
    ,
    "Maressa"
    ,
    "Marga"
    ,
    "Margalit"
    ,
    "Margalo"
    ,
    "Margaret"
    ,
    "Margareta"
    ,
    "Margarete"
    ,
    "Margaretha"
    ,
    "Margarethe"
    ,
    "Margaretta"
    ,
    "Margarette"
    ,
    "Margarita"
    ,
    "Margaux"
    ,
    "Marge"
    ,
    "Margeaux"
    ,
    "Margery"
    ,
    "Marget"
    ,
    "Margette"
    ,
    "Margi"
    ,
    "Margie"
    ,
    "Margit"
    ,
    "Margo"
    ,
    "Margot"
    ,
    "Margret"
    ,
    "Marguerite"
    ,
    "Margy"
    ,
    "Mari"
    ,
    "Maria"
    ,
    "Mariam"
    ,
    "Marian"
    ,
    "Mariana"
    ,
    "Mariann"
    ,
    "Marianna"
    ,
    "Marianne"
    ,
    "Maribel"
    ,
    "Maribelle"
    ,
    "Maribeth"
    ,
    "Marice"
    ,
    "Maridel"
    ,
    "Marie"
    ,
    "Marie-Ann"
    ,
    "Marie-Jeanne"
    ,
    "Marieann"
    ,
    "Mariejeanne"
    ,
    "Mariel"
    ,
    "Mariele"
    ,
    "Marielle"
    ,
    "Mariellen"
    ,
    "Marietta"
    ,
    "Mariette"
    ,
    "Marigold"
    ,
    "Marijo"
    ,
    "Marika"
    ,
    "Marilee"
    ,
    "Marilin"
    ,
    "Marillin"
    ,
    "Marilyn"
    ,
    "Marin"
    ,
    "Marina"
    ,
    "Marinna"
    ,
    "Marion"
    ,
    "Mariquilla"
    ,
    "Maris"
    ,
    "Marisa"
    ,
    "Mariska"
    ,
    "Marissa"
    ,
    "Marita"
    ,
    "Maritsa"
    ,
    "Mariya"
    ,
    "Marj"
    ,
    "Marja"
    ,
    "Marje"
    ,
    "Marji"
    ,
    "Marjie"
    ,
    "Marjorie"
    ,
    "Marjory"
    ,
    "Marjy"
    ,
    "Marketa"
    ,
    "Marla"
    ,
    "Marlane"
    ,
    "Marleah"
    ,
    "Marlee"
    ,
    "Marleen"
    ,
    "Marlena"
    ,
    "Marlene"
    ,
    "Marley"
    ,
    "Marlie"
    ,
    "Marline"
    ,
    "Marlo"
    ,
    "Marlyn"
    ,
    "Marna"
    ,
    "Marne"
    ,
    "Marney"
    ,
    "Marni"
    ,
    "Marnia"
    ,
    "Marnie"
    ,
    "Marquita"
    ,
    "Marrilee"
    ,
    "Marris"
    ,
    "Marrissa"
    ,
    "Marsha"
    ,
    "Marsiella"
    ,
    "Marta"
    ,
    "Martelle"
    ,
    "Martguerita"
    ,
    "Martha"
    ,
    "Marthe"
    ,
    "Marthena"
    ,
    "Marti"
    ,
    "Martica"
    ,
    "Martie"
    ,
    "Martina"
    ,
    "Martita"
    ,
    "Marty"
    ,
    "Martynne"
    ,
    "Mary"
    ,
    "Marya"
    ,
    "Maryann"
    ,
    "Maryanna"
    ,
    "Maryanne"
    ,
    "Marybelle"
    ,
    "Marybeth"
    ,
    "Maryellen"
    ,
    "Maryjane"
    ,
    "Maryjo"
    ,
    "Maryl"
    ,
    "Marylee"
    ,
    "Marylin"
    ,
    "Marylinda"
    ,
    "Marylou"
    ,
    "Marylynne"
    ,
    "Maryrose"
    ,
    "Marys"
    ,
    "Marysa"
    ,
    "Masha"
    ,
    "Matelda"
    ,
    "Mathilda"
    ,
    "Mathilde"
    ,
    "Matilda"
    ,
    "Matilde"
    ,
    "Matti"
    ,
    "Mattie"
    ,
    "Matty"
    ,
    "Maud"
    ,
    "Maude"
    ,
    "Maudie"
    ,
    "Maura"
    ,
    "Maure"
    ,
    "Maureen"
    ,
    "Maureene"
    ,
    "Maurene"
    ,
    "Maurine"
    ,
    "Maurise"
    ,
    "Maurita"
    ,
    "Maurizia"
    ,
    "Mavis"
    ,
    "Mavra"
    ,
    "Max"
    ,
    "Maxi"
    ,
    "Maxie"
    ,
    "Maxine"
    ,
    "Maxy"
    ,
    "May"
    ,
    "Maybelle"
    ,
    "Maye"
    ,
    "Mead"
    ,
    "Meade"
    ,
    "Meagan"
    ,
    "Meaghan"
    ,
    "Meara"
    ,
    "Mechelle"
    ,
    "Meg"
    ,
    "Megan"
    ,
    "Megen"
    ,
    "Meggi"
    ,
    "Meggie"
    ,
    "Meggy"
    ,
    "Meghan"
    ,
    "Meghann"
    ,
    "Mehetabel"
    ,
    "Mei"
    ,
    "Mel"
    ,
    "Mela"
    ,
    "Melamie"
    ,
    "Melania"
    ,
    "Melanie"
    ,
    "Melantha"
    ,
    "Melany"
    ,
    "Melba"
    ,
    "Melesa"
    ,
    "Melessa"
    ,
    "Melicent"
    ,
    "Melina"
    ,
    "Melinda"
    ,
    "Melinde"
    ,
    "Melisa"
    ,
    "Melisande"
    ,
    "Melisandra"
    ,
    "Melisenda"
    ,
    "Melisent"
    ,
    "Melissa"
    ,
    "Melisse"
    ,
    "Melita"
    ,
    "Melitta"
    ,
    "Mella"
    ,
    "Melli"
    ,
    "Mellicent"
    ,
    "Mellie"
    ,
    "Mellisa"
    ,
    "Mellisent"
    ,
    "Melloney"
    ,
    "Melly"
    ,
    "Melodee"
    ,
    "Melodie"
    ,
    "Melody"
    ,
    "Melonie"
    ,
    "Melony"
    ,
    "Melosa"
    ,
    "Melva"
    ,
    "Mercedes"
    ,
    "Merci"
    ,
    "Mercie"
    ,
    "Mercy"
    ,
    "Meredith"
    ,
    "Meredithe"
    ,
    "Meridel"
    ,
    "Meridith"
    ,
    "Meriel"
    ,
    "Merilee"
    ,
    "Merilyn"
    ,
    "Meris"
    ,
    "Merissa"
    ,
    "Merl"
    ,
    "Merla"
    ,
    "Merle"
    ,
    "Merlina"
    ,
    "Merline"
    ,
    "Merna"
    ,
    "Merola"
    ,
    "Merralee"
    ,
    "Merridie"
    ,
    "Merrie"
    ,
    "Merrielle"
    ,
    "Merrile"
    ,
    "Merrilee"
    ,
    "Merrili"
    ,
    "Merrill"
    ,
    "Merrily"
    ,
    "Merry"
    ,
    "Mersey"
    ,
    "Meryl"
    ,
    "Meta"
    ,
    "Mia"
    ,
    "Micaela"
    ,
    "Michaela"
    ,
    "Michaelina"
    ,
    "Michaeline"
    ,
    "Michaella"
    ,
    "Michal"
    ,
    "Michel"
    ,
    "Michele"
    ,
    "Michelina"
    ,
    "Micheline"
    ,
    "Michell"
    ,
    "Michelle"
    ,
    "Micki"
    ,
    "Mickie"
    ,
    "Micky"
    ,
    "Midge"
    ,
    "Mignon"
    ,
    "Mignonne"
    ,
    "Miguela"
    ,
    "Miguelita"
    ,
    "Mikaela"
    ,
    "Mil"
    ,
    "Mildred"
    ,
    "Mildrid"
    ,
    "Milena"
    ,
    "Milicent"
    ,
    "Milissent"
    ,
    "Milka"
    ,
    "Milli"
    ,
    "Millicent"
    ,
    "Millie"
    ,
    "Millisent"
    ,
    "Milly"
    ,
    "Milzie"
    ,
    "Mimi"
    ,
    "Min"
    ,
    "Mina"
    ,
    "Minda"
    ,
    "Mindy"
    ,
    "Minerva"
    ,
    "Minetta"
    ,
    "Minette"
    ,
    "Minna"
    ,
    "Minnaminnie"
    ,
    "Minne"
    ,
    "Minni"
    ,
    "Minnie"
    ,
    "Minnnie"
    ,
    "Minny"
    ,
    "Minta"
    ,
    "Miof Mela"
    ,
    "Miquela"
    ,
    "Mira"
    ,
    "Mirabel"
    ,
    "Mirabella"
    ,
    "Mirabelle"
    ,
    "Miran"
    ,
    "Miranda"
    ,
    "Mireielle"
    ,
    "Mireille"
    ,
    "Mirella"
    ,
    "Mirelle"
    ,
    "Miriam"
    ,
    "Mirilla"
    ,
    "Mirna"
    ,
    "Misha"
    ,
    "Missie"
    ,
    "Missy"
    ,
    "Misti"
    ,
    "Misty"
    ,
    "Mitzi"
    ,
    "Modesta"
    ,
    "Modestia"
    ,
    "Modestine"
    ,
    "Modesty"
    ,
    "Moina"
    ,
    "Moira"
    ,
    "Moll"
    ,
    "Mollee"
    ,
    "Molli"
    ,
    "Mollie"
    ,
    "Molly"
    ,
    "Mommy"
    ,
    "Mona"
    ,
    "Monah"
    ,
    "Monica"
    ,
    "Monika"
    ,
    "Monique"
    ,
    "Mora"
    ,
    "Moreen"
    ,
    "Morena"
    ,
    "Morgan"
    ,
    "Morgana"
    ,
    "Morganica"
    ,
    "Morganne"
    ,
    "Morgen"
    ,
    "Moria"
    ,
    "Morissa"
    ,
    "Morna"
    ,
    "Moselle"
    ,
    "Moyna"
    ,
    "Moyra"
    ,
    "Mozelle"
    ,
    "Muffin"
    ,
    "Mufi"
    ,
    "Mufinella"
    ,
    "Muire"
    ,
    "Mureil"
    ,
    "Murial"
    ,
    "Muriel"
    ,
    "Murielle"
    ,
    "Myra"
    ,
    "Myrah"
    ,
    "Myranda"
    ,
    "Myriam"
    ,
    "Myrilla"
    ,
    "Myrle"
    ,
    "Myrlene"
    ,
    "Myrna"
    ,
    "Myrta"
    ,
    "Myrtia"
    ,
    "Myrtice"
    ,
    "Myrtie"
    ,
    "Myrtle"
    ,
    "Nada"
    ,
    "Nadean"
    ,
    "Nadeen"
    ,
    "Nadia"
    ,
    "Nadine"
    ,
    "Nadiya"
    ,
    "Nady"
    ,
    "Nadya"
    ,
    "Nalani"
    ,
    "Nan"
    ,
    "Nana"
    ,
    "Nananne"
    ,
    "Nance"
    ,
    "Nancee"
    ,
    "Nancey"
    ,
    "Nanci"
    ,
    "Nancie"
    ,
    "Nancy"
    ,
    "Nanete"
    ,
    "Nanette"
    ,
    "Nani"
    ,
    "Nanice"
    ,
    "Nanine"
    ,
    "Nannette"
    ,
    "Nanni"
    ,
    "Nannie"
    ,
    "Nanny"
    ,
    "Nanon"
    ,
    "Naoma"
    ,
    "Naomi"
    ,
    "Nara"
    ,
    "Nari"
    ,
    "Nariko"
    ,
    "Nat"
    ,
    "Nata"
    ,
    "Natala"
    ,
    "Natalee"
    ,
    "Natalie"
    ,
    "Natalina"
    ,
    "Nataline"
    ,
    "Natalya"
    ,
    "Natasha"
    ,
    "Natassia"
    ,
    "Nathalia"
    ,
    "Nathalie"
    ,
    "Natividad"
    ,
    "Natka"
    ,
    "Natty"
    ,
    "Neala"
    ,
    "Neda"
    ,
    "Nedda"
    ,
    "Nedi"
    ,
    "Neely"
    ,
    "Neila"
    ,
    "Neile"
    ,
    "Neilla"
    ,
    "Neille"
    ,
    "Nelia"
    ,
    "Nelie"
    ,
    "Nell"
    ,
    "Nelle"
    ,
    "Nelli"
    ,
    "Nellie"
    ,
    "Nelly"
    ,
    "Nerissa"
    ,
    "Nerita"
    ,
    "Nert"
    ,
    "Nerta"
    ,
    "Nerte"
    ,
    "Nerti"
    ,
    "Nertie"
    ,
    "Nerty"
    ,
    "Nessa"
    ,
    "Nessi"
    ,
    "Nessie"
    ,
    "Nessy"
    ,
    "Nesta"
    ,
    "Netta"
    ,
    "Netti"
    ,
    "Nettie"
    ,
    "Nettle"
    ,
    "Netty"
    ,
    "Nevsa"
    ,
    "Neysa"
    ,
    "Nichol"
    ,
    "Nichole"
    ,
    "Nicholle"
    ,
    "Nicki"
    ,
    "Nickie"
    ,
    "Nicky"
    ,
    "Nicol"
    ,
    "Nicola"
    ,
    "Nicole"
    ,
    "Nicolea"
    ,
    "Nicolette"
    ,
    "Nicoli"
    ,
    "Nicolina"
    ,
    "Nicoline"
    ,
    "Nicolle"
    ,
    "Nikaniki"
    ,
    "Nike"
    ,
    "Niki"
    ,
    "Nikki"
    ,
    "Nikkie"
    ,
    "Nikoletta"
    ,
    "Nikolia"
    ,
    "Nina"
    ,
    "Ninetta"
    ,
    "Ninette"
    ,
    "Ninnetta"
    ,
    "Ninnette"
    ,
    "Ninon"
    ,
    "Nissa"
    ,
    "Nisse"
    ,
    "Nissie"
    ,
    "Nissy"
    ,
    "Nita"
    ,
    "Nixie"
    ,
    "Noami"
    ,
    "Noel"
    ,
    "Noelani"
    ,
    "Noell"
    ,
    "Noella"
    ,
    "Noelle"
    ,
    "Noellyn"
    ,
    "Noelyn"
    ,
    "Noemi"
    ,
    "Nola"
    ,
    "Nolana"
    ,
    "Nolie"
    ,
    "Nollie"
    ,
    "Nomi"
    ,
    "Nona"
    ,
    "Nonah"
    ,
    "Noni"
    ,
    "Nonie"
    ,
    "Nonna"
    ,
    "Nonnah"
    ,
    "Nora"
    ,
    "Norah"
    ,
    "Norean"
    ,
    "Noreen"
    ,
    "Norene"
    ,
    "Norina"
    ,
    "Norine"
    ,
    "Norma"
    ,
    "Norri"
    ,
    "Norrie"
    ,
    "Norry"
    ,
    "Novelia"
    ,
    "Nydia"
    ,
    "Nyssa"
    ,
    "Octavia"
    ,
    "Odele"
    ,
    "Odelia"
    ,
    "Odelinda"
    ,
    "Odella"
    ,
    "Odelle"
    ,
    "Odessa"
    ,
    "Odetta"
    ,
    "Odette"
    ,
    "Odilia"
    ,
    "Odille"
    ,
    "Ofelia"
    ,
    "Ofella"
    ,
    "Ofilia"
    ,
    "Ola"
    ,
    "Olenka"
    ,
    "Olga"
    ,
    "Olia"
    ,
    "Olimpia"
    ,
    "Olive"
    ,
    "Olivette"
    ,
    "Olivia"
    ,
    "Olivie"
    ,
    "Oliy"
    ,
    "Ollie"
    ,
    "Olly"
    ,
    "Olva"
    ,
    "Olwen"
    ,
    "Olympe"
    ,
    "Olympia"
    ,
    "Olympie"
    ,
    "Ondrea"
    ,
    "Oneida"
    ,
    "Onida"
    ,
    "Oona"
    ,
    "Opal"
    ,
    "Opalina"
    ,
    "Opaline"
    ,
    "Ophelia"
    ,
    "Ophelie"
    ,
    "Ora"
    ,
    "Oralee"
    ,
    "Oralia"
    ,
    "Oralie"
    ,
    "Oralla"
    ,
    "Oralle"
    ,
    "Orel"
    ,
    "Orelee"
    ,
    "Orelia"
    ,
    "Orelie"
    ,
    "Orella"
    ,
    "Orelle"
    ,
    "Oriana"
    ,
    "Orly"
    ,
    "Orsa"
    ,
    "Orsola"
    ,
    "Ortensia"
    ,
    "Otha"
    ,
    "Othelia"
    ,
    "Othella"
    ,
    "Othilia"
    ,
    "Othilie"
    ,
    "Ottilie"
    ,
    "Page"
    ,
    "Paige"
    ,
    "Paloma"
    ,
    "Pam"
    ,
    "Pamela"
    ,
    "Pamelina"
    ,
    "Pamella"
    ,
    "Pammi"
    ,
    "Pammie"
    ,
    "Pammy"
    ,
    "Pandora"
    ,
    "Pansie"
    ,
    "Pansy"
    ,
    "Paola"
    ,
    "Paolina"
    ,
    "Papagena"
    ,
    "Pat"
    ,
    "Patience"
    ,
    "Patrica"
    ,
    "Patrice"
    ,
    "Patricia"
    ,
    "Patrizia"
    ,
    "Patsy"
    ,
    "Patti"
    ,
    "Pattie"
    ,
    "Patty"
    ,
    "Paula"
    ,
    "Paule"
    ,
    "Pauletta"
    ,
    "Paulette"
    ,
    "Pauli"
    ,
    "Paulie"
    ,
    "Paulina"
    ,
    "Pauline"
    ,
    "Paulita"
    ,
    "Pauly"
    ,
    "Pavia"
    ,
    "Pavla"
    ,
    "Pearl"
    ,
    "Pearla"
    ,
    "Pearle"
    ,
    "Pearline"
    ,
    "Peg"
    ,
    "Pegeen"
    ,
    "Peggi"
    ,
    "Peggie"
    ,
    "Peggy"
    ,
    "Pen"
    ,
    "Penelopa"
    ,
    "Penelope"
    ,
    "Penni"
    ,
    "Pennie"
    ,
    "Penny"
    ,
    "Pepi"
    ,
    "Pepita"
    ,
    "Peri"
    ,
    "Peria"
    ,
    "Perl"
    ,
    "Perla"
    ,
    "Perle"
    ,
    "Perri"
    ,
    "Perrine"
    ,
    "Perry"
    ,
    "Persis"
    ,
    "Pet"
    ,
    "Peta"
    ,
    "Petra"
    ,
    "Petrina"
    ,
    "Petronella"
    ,
    "Petronia"
    ,
    "Petronilla"
    ,
    "Petronille"
    ,
    "Petunia"
    ,
    "Phaedra"
    ,
    "Phaidra"
    ,
    "Phebe"
    ,
    "Phedra"
    ,
    "Phelia"
    ,
    "Phil"
    ,
    "Philipa"
    ,
    "Philippa"
    ,
    "Philippe"
    ,
    "Philippine"
    ,
    "Philis"
    ,
    "Phillida"
    ,
    "Phillie"
    ,
    "Phillis"
    ,
    "Philly"
    ,
    "Philomena"
    ,
    "Phoebe"
    ,
    "Phylis"
    ,
    "Phyllida"
    ,
    "Phyllis"
    ,
    "Phyllys"
    ,
    "Phylys"
    ,
    "Pia"
    ,
    "Pier"
    ,
    "Pierette"
    ,
    "Pierrette"
    ,
    "Pietra"
    ,
    "Piper"
    ,
    "Pippa"
    ,
    "Pippy"
    ,
    "Polly"
    ,
    "Pollyanna"
    ,
    "Pooh"
    ,
    "Poppy"
    ,
    "Portia"
    ,
    "Pris"
    ,
    "Prisca"
    ,
    "Priscella"
    ,
    "Priscilla"
    ,
    "Prissie"
    ,
    "Pru"
    ,
    "Prudence"
    ,
    "Prudi"
    ,
    "Prudy"
    ,
    "Prue"
    ,
    "Queenie"
    ,
    "Quentin"
    ,
    "Querida"
    ,
    "Quinn"
    ,
    "Quinta"
    ,
    "Quintana"
    ,
    "Quintilla"
    ,
    "Quintina"
    ,
    "Rachael"
    ,
    "Rachel"
    ,
    "Rachele"
    ,
    "Rachelle"
    ,
    "Rae"
    ,
    "Raeann"
    ,
    "Raf"
    ,
    "Rafa"
    ,
    "Rafaela"
    ,
    "Rafaelia"
    ,
    "Rafaelita"
    ,
    "Rahal"
    ,
    "Rahel"
    ,
    "Raina"
    ,
    "Raine"
    ,
    "Rakel"
    ,
    "Ralina"
    ,
    "Ramona"
    ,
    "Ramonda"
    ,
    "Rana"
    ,
    "Randa"
    ,
    "Randee"
    ,
    "Randene"
    ,
    "Randi"
    ,
    "Randie"
    ,
    "Randy"
    ,
    "Ranee"
    ,
    "Rani"
    ,
    "Rania"
    ,
    "Ranice"
    ,
    "Ranique"
    ,
    "Ranna"
    ,
    "Raphaela"
    ,
    "Raquel"
    ,
    "Raquela"
    ,
    "Rasia"
    ,
    "Rasla"
    ,
    "Raven"
    ,
    "Ray"
    ,
    "Raychel"
    ,
    "Raye"
    ,
    "Rayna"
    ,
    "Raynell"
    ,
    "Rayshell"
    ,
    "Rea"
    ,
    "Reba"
    ,
    "Rebbecca"
    ,
    "Rebe"
    ,
    "Rebeca"
    ,
    "Rebecca"
    ,
    "Rebecka"
    ,
    "Rebeka"
    ,
    "Rebekah"
    ,
    "Rebekkah"
    ,
    "Ree"
    ,
    "Reeba"
    ,
    "Reena"
    ,
    "Reeta"
    ,
    "Reeva"
    ,
    "Regan"
    ,
    "Reggi"
    ,
    "Reggie"
    ,
    "Regina"
    ,
    "Regine"
    ,
    "Reiko"
    ,
    "Reina"
    ,
    "Reine"
    ,
    "Remy"
    ,
    "Rena"
    ,
    "Renae"
    ,
    "Renata"
    ,
    "Renate"
    ,
    "Rene"
    ,
    "Renee"
    ,
    "Renell"
    ,
    "Renelle"
    ,
    "Renie"
    ,
    "Rennie"
    ,
    "Reta"
    ,
    "Retha"
    ,
    "Revkah"
    ,
    "Rey"
    ,
    "Reyna"
    ,
    "Rhea"
    ,
    "Rheba"
    ,
    "Rheta"
    ,
    "Rhetta"
    ,
    "Rhiamon"
    ,
    "Rhianna"
    ,
    "Rhianon"
    ,
    "Rhoda"
    ,
    "Rhodia"
    ,
    "Rhodie"
    ,
    "Rhody"
    ,
    "Rhona"
    ,
    "Rhonda"
    ,
    "Riane"
    ,
    "Riannon"
    ,
    "Rianon"
    ,
    "Rica"
    ,
    "Ricca"
    ,
    "Rici"
    ,
    "Ricki"
    ,
    "Rickie"
    ,
    "Ricky"
    ,
    "Riki"
    ,
    "Rikki"
    ,
    "Rina"
    ,
    "Risa"
    ,
    "Rita"
    ,
    "Riva"
    ,
    "Rivalee"
    ,
    "Rivi"
    ,
    "Rivkah"
    ,
    "Rivy"
    ,
    "Roana"
    ,
    "Roanna"
    ,
    "Roanne"
    ,
    "Robbi"
    ,
    "Robbie"
    ,
    "Robbin"
    ,
    "Robby"
    ,
    "Robbyn"
    ,
    "Robena"
    ,
    "Robenia"
    ,
    "Roberta"
    ,
    "Robin"
    ,
    "Robina"
    ,
    "Robinet"
    ,
    "Robinett"
    ,
    "Robinetta"
    ,
    "Robinette"
    ,
    "Robinia"
    ,
    "Roby"
    ,
    "Robyn"
    ,
    "Roch"
    ,
    "Rochell"
    ,
    "Rochella"
    ,
    "Rochelle"
    ,
    "Rochette"
    ,
    "Roda"
    ,
    "Rodi"
    ,
    "Rodie"
    ,
    "Rodina"
    ,
    "Rois"
    ,
    "Romola"
    ,
    "Romona"
    ,
    "Romonda"
    ,
    "Romy"
    ,
    "Rona"
    ,
    "Ronalda"
    ,
    "Ronda"
    ,
    "Ronica"
    ,
    "Ronna"
    ,
    "Ronni"
    ,
    "Ronnica"
    ,
    "Ronnie"
    ,
    "Ronny"
    ,
    "Roobbie"
    ,
    "Rora"
    ,
    "Rori"
    ,
    "Rorie"
    ,
    "Rory"
    ,
    "Ros"
    ,
    "Rosa"
    ,
    "Rosabel"
    ,
    "Rosabella"
    ,
    "Rosabelle"
    ,
    "Rosaleen"
    ,
    "Rosalia"
    ,
    "Rosalie"
    ,
    "Rosalind"
    ,
    "Rosalinda"
    ,
    "Rosalinde"
    ,
    "Rosaline"
    ,
    "Rosalyn"
    ,
    "Rosalynd"
    ,
    "Rosamond"
    ,
    "Rosamund"
    ,
    "Rosana"
    ,
    "Rosanna"
    ,
    "Rosanne"
    ,
    "Rose"
    ,
    "Roseann"
    ,
    "Roseanna"
    ,
    "Roseanne"
    ,
    "Roselia"
    ,
    "Roselin"
    ,
    "Roseline"
    ,
    "Rosella"
    ,
    "Roselle"
    ,
    "Rosemaria"
    ,
    "Rosemarie"
    ,
    "Rosemary"
    ,
    "Rosemonde"
    ,
    "Rosene"
    ,
    "Rosetta"
    ,
    "Rosette"
    ,
    "Roshelle"
    ,
    "Rosie"
    ,
    "Rosina"
    ,
    "Rosita"
    ,
    "Roslyn"
    ,
    "Rosmunda"
    ,
    "Rosy"
    ,
    "Row"
    ,
    "Rowe"
    ,
    "Rowena"
    ,
    "Roxana"
    ,
    "Roxane"
    ,
    "Roxanna"
    ,
    "Roxanne"
    ,
    "Roxi"
    ,
    "Roxie"
    ,
    "Roxine"
    ,
    "Roxy"
    ,
    "Roz"
    ,
    "Rozalie"
    ,
    "Rozalin"
    ,
    "Rozamond"
    ,
    "Rozanna"
    ,
    "Rozanne"
    ,
    "Roze"
    ,
    "Rozele"
    ,
    "Rozella"
    ,
    "Rozelle"
    ,
    "Rozina"
    ,
    "Rubetta"
    ,
    "Rubi"
    ,
    "Rubia"
    ,
    "Rubie"
    ,
    "Rubina"
    ,
    "Ruby"
    ,
    "Ruperta"
    ,
    "Ruth"
    ,
    "Ruthann"
    ,
    "Ruthanne"
    ,
    "Ruthe"
    ,
    "Ruthi"
    ,
    "Ruthie"
    ,
    "Ruthy"
    ,
    "Ryann"
    ,
    "Rycca"
    ,
    "Saba"
    ,
    "Sabina"
    ,
    "Sabine"
    ,
    "Sabra"
    ,
    "Sabrina"
    ,
    "Sacha"
    ,
    "Sada"
    ,
    "Sadella"
    ,
    "Sadie"
    ,
    "Sadye"
    ,
    "Saidee"
    ,
    "Sal"
    ,
    "Salaidh"
    ,
    "Sallee"
    ,
    "Salli"
    ,
    "Sallie"
    ,
    "Sally"
    ,
    "Sallyann"
    ,
    "Sallyanne"
    ,
    "Saloma"
    ,
    "Salome"
    ,
    "Salomi"
    ,
    "Sam"
    ,
    "Samantha"
    ,
    "Samara"
    ,
    "Samaria"
    ,
    "Sammy"
    ,
    "Sande"
    ,
    "Sandi"
    ,
    "Sandie"
    ,
    "Sandra"
    ,
    "Sandy"
    ,
    "Sandye"
    ,
    "Sapphira"
    ,
    "Sapphire"
    ,
    "Sara"
    ,
    "Sara-Ann"
    ,
    "Saraann"
    ,
    "Sarah"
    ,
    "Sarajane"
    ,
    "Saree"
    ,
    "Sarena"
    ,
    "Sarene"
    ,
    "Sarette"
    ,
    "Sari"
    ,
    "Sarina"
    ,
    "Sarine"
    ,
    "Sarita"
    ,
    "Sascha"
    ,
    "Sasha"
    ,
    "Sashenka"
    ,
    "Saudra"
    ,
    "Saundra"
    ,
    "Savina"
    ,
    "Sayre"
    ,
    "Scarlet"
    ,
    "Scarlett"
    ,
    "Sean"
    ,
    "Seana"
    ,
    "Seka"
    ,
    "Sela"
    ,
    "Selena"
    ,
    "Selene"
    ,
    "Selestina"
    ,
    "Selia"
    ,
    "Selie"
    ,
    "Selina"
    ,
    "Selinda"
    ,
    "Seline"
    ,
    "Sella"
    ,
    "Selle"
    ,
    "Selma"
    ,
    "Sena"
    ,
    "Sephira"
    ,
    "Serena"
    ,
    "Serene"
    ,
    "Shae"
    ,
    "Shaina"
    ,
    "Shaine"
    ,
    "Shalna"
    ,
    "Shalne"
    ,
    "Shana"
    ,
    "Shanda"
    ,
    "Shandee"
    ,
    "Shandeigh"
    ,
    "Shandie"
    ,
    "Shandra"
    ,
    "Shandy"
    ,
    "Shane"
    ,
    "Shani"
    ,
    "Shanie"
    ,
    "Shanna"
    ,
    "Shannah"
    ,
    "Shannen"
    ,
    "Shannon"
    ,
    "Shanon"
    ,
    "Shanta"
    ,
    "Shantee"
    ,
    "Shara"
    ,
    "Sharai"
    ,
    "Shari"
    ,
    "Sharia"
    ,
    "Sharity"
    ,
    "Sharl"
    ,
    "Sharla"
    ,
    "Sharleen"
    ,
    "Sharlene"
    ,
    "Sharline"
    ,
    "Sharon"
    ,
    "Sharona"
    ,
    "Sharron"
    ,
    "Sharyl"
    ,
    "Shaun"
    ,
    "Shauna"
    ,
    "Shawn"
    ,
    "Shawna"
    ,
    "Shawnee"
    ,
    "Shay"
    ,
    "Shayla"
    ,
    "Shaylah"
    ,
    "Shaylyn"
    ,
    "Shaylynn"
    ,
    "Shayna"
    ,
    "Shayne"
    ,
    "Shea"
    ,
    "Sheba"
    ,
    "Sheela"
    ,
    "Sheelagh"
    ,
    "Sheelah"
    ,
    "Sheena"
    ,
    "Sheeree"
    ,
    "Sheila"
    ,
    "Sheila-Kathryn"
    ,
    "Sheilah"
    ,
    "Shel"
    ,
    "Shela"
    ,
    "Shelagh"
    ,
    "Shelba"
    ,
    "Shelbi"
    ,
    "Shelby"
    ,
    "Shelia"
    ,
    "Shell"
    ,
    "Shelley"
    ,
    "Shelli"
    ,
    "Shellie"
    ,
    "Shelly"
    ,
    "Shena"
    ,
    "Sher"
    ,
    "Sheree"
    ,
    "Sheri"
    ,
    "Sherie"
    ,
    "Sherill"
    ,
    "Sherilyn"
    ,
    "Sherline"
    ,
    "Sherri"
    ,
    "Sherrie"
    ,
    "Sherry"
    ,
    "Sherye"
    ,
    "Sheryl"
    ,
    "Shina"
    ,
    "Shir"
    ,
    "Shirl"
    ,
    "Shirlee"
    ,
    "Shirleen"
    ,
    "Shirlene"
    ,
    "Shirley"
    ,
    "Shirline"
    ,
    "Shoshana"
    ,
    "Shoshanna"
    ,
    "Siana"
    ,
    "Sianna"
    ,
    "Sib"
    ,
    "Sibbie"
    ,
    "Sibby"
    ,
    "Sibeal"
    ,
    "Sibel"
    ,
    "Sibella"
    ,
    "Sibelle"
    ,
    "Sibilla"
    ,
    "Sibley"
    ,
    "Sibyl"
    ,
    "Sibylla"
    ,
    "Sibylle"
    ,
    "Sidoney"
    ,
    "Sidonia"
    ,
    "Sidonnie"
    ,
    "Sigrid"
    ,
    "Sile"
    ,
    "Sileas"
    ,
    "Silva"
    ,
    "Silvana"
    ,
    "Silvia"
    ,
    "Silvie"
    ,
    "Simona"
    ,
    "Simone"
    ,
    "Simonette"
    ,
    "Simonne"
    ,
    "Sindee"
    ,
    "Siobhan"
    ,
    "Sioux"
    ,
    "Siouxie"
    ,
    "Sisely"
    ,
    "Sisile"
    ,
    "Sissie"
    ,
    "Sissy"
    ,
    "Siusan"
    ,
    "Sofia"
    ,
    "Sofie"
    ,
    "Sondra"
    ,
    "Sonia"
    ,
    "Sonja"
    ,
    "Sonni"
    ,
    "Sonnie"
    ,
    "Sonnnie"
    ,
    "Sonny"
    ,
    "Sonya"
    ,
    "Sophey"
    ,
    "Sophi"
    ,
    "Sophia"
    ,
    "Sophie"
    ,
    "Sophronia"
    ,
    "Sorcha"
    ,
    "Sosanna"
    ,
    "Stace"
    ,
    "Stacee"
    ,
    "Stacey"
    ,
    "Staci"
    ,
    "Stacia"
    ,
    "Stacie"
    ,
    "Stacy"
    ,
    "Stafani"
    ,
    "Star"
    ,
    "Starla"
    ,
    "Starlene"
    ,
    "Starlin"
    ,
    "Starr"
    ,
    "Stefa"
    ,
    "Stefania"
    ,
    "Stefanie"
    ,
    "Steffane"
    ,
    "Steffi"
    ,
    "Steffie"
    ,
    "Stella"
    ,
    "Stepha"
    ,
    "Stephana"
    ,
    "Stephani"
    ,
    "Stephanie"
    ,
    "Stephannie"
    ,
    "Stephenie"
    ,
    "Stephi"
    ,
    "Stephie"
    ,
    "Stephine"
    ,
    "Stesha"
    ,
    "Stevana"
    ,
    "Stevena"
    ,
    "Stoddard"
    ,
    "Storm"
    ,
    "Stormi"
    ,
    "Stormie"
    ,
    "Stormy"
    ,
    "Sue"
    ,
    "Suellen"
    ,
    "Sukey"
    ,
    "Suki"
    ,
    "Sula"
    ,
    "Sunny"
    ,
    "Sunshine"
    ,
    "Susan"
    ,
    "Susana"
    ,
    "Susanetta"
    ,
    "Susann"
    ,
    "Susanna"
    ,
    "Susannah"
    ,
    "Susanne"
    ,
    "Susette"
    ,
    "Susi"
    ,
    "Susie"
    ,
    "Susy"
    ,
    "Suzann"
    ,
    "Suzanna"
    ,
    "Suzanne"
    ,
    "Suzette"
    ,
    "Suzi"
    ,
    "Suzie"
    ,
    "Suzy"
    ,
    "Sybil"
    ,
    "Sybila"
    ,
    "Sybilla"
    ,
    "Sybille"
    ,
    "Sybyl"
    ,
    "Sydel"
    ,
    "Sydelle"
    ,
    "Sydney"
    ,
    "Sylvia"
    ,
    "Tabatha"
    ,
    "Tabbatha"
    ,
    "Tabbi"
    ,
    "Tabbie"
    ,
    "Tabbitha"
    ,
    "Tabby"
    ,
    "Tabina"
    ,
    "Tabitha"
    ,
    "Taffy"
    ,
    "Talia"
    ,
    "Tallia"
    ,
    "Tallie"
    ,
    "Tallou"
    ,
    "Tallulah"
    ,
    "Tally"
    ,
    "Talya"
    ,
    "Talyah"
    ,
    "Tamar"
    ,
    "Tamara"
    ,
    "Tamarah"
    ,
    "Tamarra"
    ,
    "Tamera"
    ,
    "Tami"
    ,
    "Tamiko"
    ,
    "Tamma"
    ,
    "Tammara"
    ,
    "Tammi"
    ,
    "Tammie"
    ,
    "Tammy"
    ,
    "Tamqrah"
    ,
    "Tamra"
    ,
    "Tana"
    ,
    "Tandi"
    ,
    "Tandie"
    ,
    "Tandy"
    ,
    "Tanhya"
    ,
    "Tani"
    ,
    "Tania"
    ,
    "Tanitansy"
    ,
    "Tansy"
    ,
    "Tanya"
    ,
    "Tara"
    ,
    "Tarah"
    ,
    "Tarra"
    ,
    "Tarrah"
    ,
    "Taryn"
    ,
    "Tasha"
    ,
    "Tasia"
    ,
    "Tate"
    ,
    "Tatiana"
    ,
    "Tatiania"
    ,
    "Tatum"
    ,
    "Tawnya"
    ,
    "Tawsha"
    ,
    "Ted"
    ,
    "Tedda"
    ,
    "Teddi"
    ,
    "Teddie"
    ,
    "Teddy"
    ,
    "Tedi"
    ,
    "Tedra"
    ,
    "Teena"
    ,
    "TEirtza"
    ,
    "Teodora"
    ,
    "Tera"
    ,
    "Teresa"
    ,
    "Terese"
    ,
    "Teresina"
    ,
    "Teresita"
    ,
    "Teressa"
    ,
    "Teri"
    ,
    "Teriann"
    ,
    "Terra"
    ,
    "Terri"
    ,
    "Terrie"
    ,
    "Terrijo"
    ,
    "Terry"
    ,
    "Terrye"
    ,
    "Tersina"
    ,
    "Terza"
    ,
    "Tess"
    ,
    "Tessa"
    ,
    "Tessi"
    ,
    "Tessie"
    ,
    "Tessy"
    ,
    "Thalia"
    ,
    "Thea"
    ,
    "Theadora"
    ,
    "Theda"
    ,
    "Thekla"
    ,
    "Thelma"
    ,
    "Theo"
    ,
    "Theodora"
    ,
    "Theodosia"
    ,
    "Theresa"
    ,
    "Therese"
    ,
    "Theresina"
    ,
    "Theresita"
    ,
    "Theressa"
    ,
    "Therine"
    ,
    "Thia"
    ,
    "Thomasa"
    ,
    "Thomasin"
    ,
    "Thomasina"
    ,
    "Thomasine"
    ,
    "Tiena"
    ,
    "Tierney"
    ,
    "Tiertza"
    ,
    "Tiff"
    ,
    "Tiffani"
    ,
    "Tiffanie"
    ,
    "Tiffany"
    ,
    "Tiffi"
    ,
    "Tiffie"
    ,
    "Tiffy"
    ,
    "Tilda"
    ,
    "Tildi"
    ,
    "Tildie"
    ,
    "Tildy"
    ,
    "Tillie"
    ,
    "Tilly"
    ,
    "Tim"
    ,
    "Timi"
    ,
    "Timmi"
    ,
    "Timmie"
    ,
    "Timmy"
    ,
    "Timothea"
    ,
    "Tina"
    ,
    "Tine"
    ,
    "Tiphani"
    ,
    "Tiphanie"
    ,
    "Tiphany"
    ,
    "Tish"
    ,
    "Tisha"
    ,
    "Tobe"
    ,
    "Tobey"
    ,
    "Tobi"
    ,
    "Toby"
    ,
    "Tobye"
    ,
    "Toinette"
    ,
    "Toma"
    ,
    "Tomasina"
    ,
    "Tomasine"
    ,
    "Tomi"
    ,
    "Tommi"
    ,
    "Tommie"
    ,
    "Tommy"
    ,
    "Toni"
    ,
    "Tonia"
    ,
    "Tonie"
    ,
    "Tony"
    ,
    "Tonya"
    ,
    "Tonye"
    ,
    "Tootsie"
    ,
    "Torey"
    ,
    "Tori"
    ,
    "Torie"
    ,
    "Torrie"
    ,
    "Tory"
    ,
    "Tova"
    ,
    "Tove"
    ,
    "Tracee"
    ,
    "Tracey"
    ,
    "Traci"
    ,
    "Tracie"
    ,
    "Tracy"
    ,
    "Trenna"
    ,
    "Tresa"
    ,
    "Trescha"
    ,
    "Tressa"
    ,
    "Tricia"
    ,
    "Trina"
    ,
    "Trish"
    ,
    "Trisha"
    ,
    "Trista"
    ,
    "Trix"
    ,
    "Trixi"
    ,
    "Trixie"
    ,
    "Trixy"
    ,
    "Truda"
    ,
    "Trude"
    ,
    "Trudey"
    ,
    "Trudi"
    ,
    "Trudie"
    ,
    "Trudy"
    ,
    "Trula"
    ,
    "Tuesday"
    ,
    "Twila"
    ,
    "Twyla"
    ,
    "Tybi"
    ,
    "Tybie"
    ,
    "Tyne"
    ,
    "Ula"
    ,
    "Ulla"
    ,
    "Ulrica"
    ,
    "Ulrika"
    ,
    "Ulrikaumeko"
    ,
    "Ulrike"
    ,
    "Umeko"
    ,
    "Una"
    ,
    "Ursa"
    ,
    "Ursala"
    ,
    "Ursola"
    ,
    "Ursula"
    ,
    "Ursulina"
    ,
    "Ursuline"
    ,
    "Uta"
    ,
    "Val"
    ,
    "Valaree"
    ,
    "Valaria"
    ,
    "Vale"
    ,
    "Valeda"
    ,
    "Valencia"
    ,
    "Valene"
    ,
    "Valenka"
    ,
    "Valentia"
    ,
    "Valentina"
    ,
    "Valentine"
    ,
    "Valera"
    ,
    "Valeria"
    ,
    "Valerie"
    ,
    "Valery"
    ,
    "Valerye"
    ,
    "Valida"
    ,
    "Valina"
    ,
    "Valli"
    ,
    "Vallie"
    ,
    "Vally"
    ,
    "Valma"
    ,
    "Valry"
    ,
    "Van"
    ,
    "Vanda"
    ,
    "Vanessa"
    ,
    "Vania"
    ,
    "Vanna"
    ,
    "Vanni"
    ,
    "Vannie"
    ,
    "Vanny"
    ,
    "Vanya"
    ,
    "Veda"
    ,
    "Velma"
    ,
    "Velvet"
    ,
    "Venita"
    ,
    "Venus"
    ,
    "Vera"
    ,
    "Veradis"
    ,
    "Vere"
    ,
    "Verena"
    ,
    "Verene"
    ,
    "Veriee"
    ,
    "Verile"
    ,
    "Verina"
    ,
    "Verine"
    ,
    "Verla"
    ,
    "Verna"
    ,
    "Vernice"
    ,
    "Veronica"
    ,
    "Veronika"
    ,
    "Veronike"
    ,
    "Veronique"
    ,
    "Vevay"
    ,
    "Vi"
    ,
    "Vicki"
    ,
    "Vickie"
    ,
    "Vicky"
    ,
    "Victoria"
    ,
    "Vida"
    ,
    "Viki"
    ,
    "Vikki"
    ,
    "Vikky"
    ,
    "Vilhelmina"
    ,
    "Vilma"
    ,
    "Vin"
    ,
    "Vina"
    ,
    "Vinita"
    ,
    "Vinni"
    ,
    "Vinnie"
    ,
    "Vinny"
    ,
    "Viola"
    ,
    "Violante"
    ,
    "Viole"
    ,
    "Violet"
    ,
    "Violetta"
    ,
    "Violette"
    ,
    "Virgie"
    ,
    "Virgina"
    ,
    "Virginia"
    ,
    "Virginie"
    ,
    "Vita"
    ,
    "Vitia"
    ,
    "Vitoria"
    ,
    "Vittoria"
    ,
    "Viv"
    ,
    "Viva"
    ,
    "Vivi"
    ,
    "Vivia"
    ,
    "Vivian"
    ,
    "Viviana"
    ,
    "Vivianna"
    ,
    "Vivianne"
    ,
    "Vivie"
    ,
    "Vivien"
    ,
    "Viviene"
    ,
    "Vivienne"
    ,
    "Viviyan"
    ,
    "Vivyan"
    ,
    "Vivyanne"
    ,
    "Vonni"
    ,
    "Vonnie"
    ,
    "Vonny"
    ,
    "Vyky"
    ,
    "Wallie"
    ,
    "Wallis"
    ,
    "Walliw"
    ,
    "Wally"
    ,
    "Waly"
    ,
    "Wanda"
    ,
    "Wandie"
    ,
    "Wandis"
    ,
    "Waneta"
    ,
    "Wanids"
    ,
    "Wenda"
    ,
    "Wendeline"
    ,
    "Wendi"
    ,
    "Wendie"
    ,
    "Wendy"
    ,
    "Wendye"
    ,
    "Wenona"
    ,
    "Wenonah"
    ,
    "Whitney"
    ,
    "Wileen"
    ,
    "Wilhelmina"
    ,
    "Wilhelmine"
    ,
    "Wilie"
    ,
    "Willa"
    ,
    "Willabella"
    ,
    "Willamina"
    ,
    "Willetta"
    ,
    "Willette"
    ,
    "Willi"
    ,
    "Willie"
    ,
    "Willow"
    ,
    "Willy"
    ,
    "Willyt"
    ,
    "Wilma"
    ,
    "Wilmette"
    ,
    "Wilona"
    ,
    "Wilone"
    ,
    "Wilow"
    ,
    "Windy"
    ,
    "Wini"
    ,
    "Winifred"
    ,
    "Winna"
    ,
    "Winnah"
    ,
    "Winne"
    ,
    "Winni"
    ,
    "Winnie"
    ,
    "Winnifred"
    ,
    "Winny"
    ,
    "Winona"
    ,
    "Winonah"
    ,
    "Wren"
    ,
    "Wrennie"
    ,
    "Wylma"
    ,
    "Wynn"
    ,
    "Wynne"
    ,
    "Wynnie"
    ,
    "Wynny"
    ,
    "Xaviera"
    ,
    "Xena"
    ,
    "Xenia"
    ,
    "Xylia"
    ,
    "Xylina"
    ,
    "Yalonda"
    ,
    "Yasmeen"
    ,
    "Yasmin"
    ,
    "Yelena"
    ,
    "Yetta"
    ,
    "Yettie"
    ,
    "Yetty"
    ,
    "Yevette"
    ,
    "Ynes"
    ,
    "Ynez"
    ,
    "Yoko"
    ,
    "Yolanda"
    ,
    "Yolande"
    ,
    "Yolane"
    ,
    "Yolanthe"
    ,
    "Yoshi"
    ,
    "Yoshiko"
    ,
    "Yovonnda"
    ,
    "Ysabel"
    ,
    "Yvette"
    ,
    "Yvonne"
    ,
    "Zabrina"
    ,
    "Zahara"
    ,
    "Zandra"
    ,
    "Zaneta"
    ,
    "Zara"
    ,
    "Zarah"
    ,
    "Zaria"
    ,
    "Zarla"
    ,
    "Zea"
    ,
    "Zelda"
    ,
    "Zelma"
    ,
    "Zena"
    ,
    "Zenia"
    ,
    "Zia"
    ,
    "Zilvia"
    ,
    "Zita"
    ,
    "Zitella"
    ,
    "Zoe"
    ,
    "Zola"
    ,
    "Zonda"
    ,
    "Zondra"
    ,
    "Zonnya"
    ,
    "Zora"
    ,
    "Zorah"
    ,
    "Zorana"
    ,
    "Zorina"
    ,
    "Zorine"
    ,
    "Zsa Zsa"
    ,
    "Zsazsa"
    ,
    "Zulema"
    ,
    "Zuzana"
    ];
let currentNameIndex = 0;
let nextPlayerId = 0; // Simple ID generator for LogicalPlayers

// --- Configuration Constants ---
const MIN_ACTIVE_PLAYERS = 20;
const initialPlayerCount = MIN_ACTIVE_PLAYERS;
const maxFoodCount = 120;
const foodRadius = 3;
const initialVirusCount = 5;
const virusRadius = 35;
const virusColor = '#33ff33';
const virusSpikeCount = 10;
const virusSplitMassThresholdMultiplier = 1.15;
const playerSplitPieces = 7;
const playerSplitMinMassPerPiece = 100;
const playerSplitBurstSpeed = 1; // *** Reduced burst speed slightly ***
const respawnDelay = 5000;
const MAX_DELTA_TIME = 50;
const LEADERBOARD_UPDATE_INTERVAL = 300;
const MERGE_COOLDOWN = 5000; // *** Slightly increased merge cooldown ***

const PLAYER_EAT_DISTANCE_FACTOR = 0.4;
const VIRUS_SPLIT_DISTANCE_FACTOR = 0.4;
const MERGE_OVERLAP_FACTOR = 0.8; // *** ADD THIS (0.0 to 1.0) - Higher value = LESS overlap needed for merge ***

// --- 排斥力相關常數 ---
const INTRA_PLAYER_REPULSION_ENABLED = true;
const REPULSION_FORCE_MULTIPLIER = 0.2;   // 基礎強度
const REPULSION_EFFECTIVE_DISTANCE_FACTOR = 1.4;
// const REPULSION_FADES_WITH_TIMER = true; // *** 移除或註解掉這個，改用窗口衰減 ***
const REPULSION_MIN_FORCE_FACTOR = 0.05; // *** 最低力因子，可以設更小，例如 0.05 ***

// *** 新增衰減窗口常數 ***
const REPULSION_FADE_WINDOW_MS = 1000; // 排斥力在合併前多少毫秒開始衰減 (例如 1000ms = 1秒)

// *** 新增：餵食病毒相關常數 ***
const AI_CAN_FEED_VIRUS = true;           // AI是否啟用餵食病毒功能
const MIN_MASS_TO_FEED_VIRUS = 10000;     // AI自身(或最大細胞)需要多少質量才能餵食
const VIRUS_FEED_MASS_COST = 1000;        // 每次餵食損失的質量
const VIRUS_MAX_FEED_COUNT = 7;         // 病毒被餵食多少次後會分裂
const FEED_VIRUS_RANGE_FACTOR = 0.8;    // AI視野的多少比例內尋找目標和病毒
const FEED_TARGET_MAX_MASS_FACTOR = 100; // 目標質量不能超過自身質量的多少倍 (避免餵超級巨無霸)

// *** 新增：用於餵食動畫的顆粒類別 ***
const PELLET_SPEED = 15;       // 飼料顆粒的飛行速度
const PELLET_LIFESPAN = 300;   // 飼料顆粒的存在時間 (毫秒)
const PELLET_RADIUS = 15;       // 飼料顆粒的半徑

// *** 新增：安全生成相關常數 ***
const MAX_SPAWN_ATTEMPTS = 100;    // 尋找安全生成點的最大嘗試次數
const SPAWN_SAFETY_BUFFER = 15;   // 生成時與其他對象保持的額外距離緩衝

// *** Speed adjustment ***
let cellBaseSpeedMultiplier = 3.0; // *** 基礎速度乘數 ***
const CELL_SPEED_MASS_FACTOR = 0.045; // *** Slightly increased mass effect on speed reduction ***

// *** 新增：遊戲重置相關常數 ***
const RESET_ON_MAP_COVERAGE = true;     // 是否啟用覆蓋重置
const MAP_COVERAGE_RADIUS_FACTOR = 0.85; // 細胞半徑達到螢幕較小邊的多少比例時觸發重置 (0.85 = 85%)
let isResettingGame = false; // 防止重複重置的標誌

// --- Global Variables ---
let leaderboardUpdateCooldown = LEADERBOARD_UPDATE_INTERVAL;
let lastTime = 0;
let isPausedForFade = false; // *** 新增：控制遊戲循環暫停的標誌 ***
const INTRA_PLAYER_COLLISION_ENABLED = true; // *** 是否啟用細胞間碰撞 ***
const FADE_DURATION = 2000; // *** 匹配 CSS 的 transition duration (1.2s = 1200ms) ***
const BLACK_SCREEN_DURATION = 500; // *** 額外保持黑屏的時間 (0.5s) ***

// --- Wallpaper Engine Property Listener ---
window.wallpaperPropertyListener = {
    applyUserProperties: function(properties) {
        if (properties.cellbasespeed) {
            // 從屬性中獲取值並更新全局變量
            cellBaseSpeedMultiplier = properties.cellbasespeed.value;
            console.log("Cell Base Speed Multiplier updated to:", cellBaseSpeedMultiplier);
            // 注意：因為 calculateSpeed 現在直接讀取全局變量，
            // 所以不需要手動更新所有現有細胞的速度乘數。
        }
        // 在這裡可以添加監聽其他屬性的代碼 (如果以後添加更多屬性)
        /*
        if (properties.someOtherProperty) {
            // ... 更新其他全局變量 ...
        }
        */
    },
    // 可以保留或添加其他監聽器如 applyGeneralProperties, setPaused 等 (如果需要)
    // setPaused: function(isPaused) {
    //     // Handle wallpaper pausing if needed
    // }
};

// --- Helper Functions ---
function getRandomColor() { /* ... (keep existing) ... */
    let color = '#';
    do {
        color = '#';
        const letters = '0123456789ABCDEF';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
    } while (parseInt(color.substring(1, 3), 16) < 100 && parseInt(color.substring(3, 5), 16) > 150 && parseInt(color.substring(5, 7), 16) < 100);
    return color;
}
function getRandomInt(min, max) { /* ... (keep existing) ... */
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function distanceSq(x1, y1, x2, y2) { /* ... (keep existing) ... */
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
}
function shuffleArray(array) { /* ... (keep existing) ... */
     for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
function getNextName() { /* ... (keep existing) ... */
     if (!nameList || nameList.length === 0) {
        return `Cell_${Math.floor(Math.random() * 1000)}`;
    }
    const name = nameList[currentNameIndex];
    currentNameIndex = (currentNameIndex + 1) % nameList.length;
    return name;
}


// --- Classes ---

class FeedPellet {
    constructor(startX, startY, targetX, targetY, radius, color) {
        this.x = startX;
        this.y = startY;
        this.radius = radius;
        this.color = color;
        this.lifeTimer = PELLET_LIFESPAN;

        // 計算朝向目標的速度向量
        const dx = targetX - startX;
        const dy = targetY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.1) { // 避免除以零
            this.vx = (dx / dist) * PELLET_SPEED;
            this.vy = (dy / dist) * PELLET_SPEED;
        } else {
            // 如果起始點和目標點太近，隨機給一個小速度或設為0
            this.vx = (Math.random() - 0.5) * PELLET_SPEED * 0.1;
            this.vy = (Math.random() - 0.5) * PELLET_SPEED * 0.1;
        }
    }

    update(deltaTime) {
        const timeFactor = deltaTime / 16.67; // 時間標準化
        this.x += this.vx * timeFactor;
        this.y += this.vy * timeFactor;
        this.lifeTimer -= deltaTime;

        // 速度可以稍微減慢 (可選)
        // this.vx *= 0.99;
        // this.vy *= 0.99;

        return this.lifeTimer > 0; // 返回是否仍然存活
    }

    draw() {
        // 可以根據剩餘壽命調整透明度
        const opacity = Math.max(0, Math.min(1, this.lifeTimer / PELLET_LIFESPAN));
        // 嘗試從原始顏色創建帶透明度的顏色
        let drawColor = this.color;
        if (this.color.startsWith('#') && this.color.length === 7) {
             const alphaHex = Math.floor(opacity * 255).toString(16).padStart(2, '0');
             drawColor = this.color + alphaHex;
        } else {
             // 對於命名顏色或rgba，處理可能更複雜，暫用固定透明度
             ctx.globalAlpha = opacity;
        }


        ctx.fillStyle = drawColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();

        // 恢復全局透明度 (如果修改了)
        if (!drawColor.startsWith('#') || drawColor.length !== 9) {
            ctx.globalAlpha = 1.0;
        }
    }
}

class LogicalPlayer {
    constructor(name, color) {
        this.id = nextPlayerId++;
        this.name = name || getNextName();
        this.color = color || getRandomColor();
        this.cells = [];
        this.totalMass = 0;
        this.isEaten = false;
        this.respawnTimer = 0;

        this.aiTarget = null; // Basic target for all cells
        this.aiUpdateCooldown = Math.random() * 200; // Stagger initial AI updates
        this.aiUpdateInterval = 200 + Math.random() * 150; // AI decision interval

        this.createInitialCell();
    }

    // *** 新增：判斷是否處於明顯的分裂狀態 ***
    isSplitState(maxCellsConsideredConsolidated = 2, minMassRatioForLargest = 0.7) {
        if (this.cells.length <= maxCellsConsideredConsolidated) {
            return false; // 細胞數量很少，不算分裂
        }
        // 如果細胞數量多，檢查最大細胞質量佔總質量的比例
        const largestMass = this.findLargestCellMass();
        if (this.totalMass > 0 && (largestMass / this.totalMass) < minMassRatioForLargest) {
            return true; // 最大細胞佔比不高，認為是分裂狀態
        }
        return false; // 細胞多但有一個佔主導，不算典型分裂
    }

    // *** 新增：找到自己最近的、可被威脅吃掉的小細胞 ***
    findNearestVulnerableCellToThreat(threatPosition, threatLargestMass) {
        let nearestVulnerableCell = null;
        let minDistSq = Infinity;

        for (const cell of this.cells) {
            // 假設威脅至少要比小細胞大一點才能吃 (例如 1.15 倍)
            if (threatLargestMass > cell.mass * 1.15) {
                const dSq = distanceSq(cell.x, cell.y, threatPosition.x, threatPosition.y);
                if (dSq < minDistSq) {
                    minDistSq = dSq;
                    nearestVulnerableCell = cell;
                }
            }
        }
        return { cell: nearestVulnerableCell, distSq: minDistSq };
    }

    createInitialCell() {
        let attempts = 0;
        let safeX, safeY, isSafe = false; // *** 初始化 isSafe 為 false ***
        let initialRadius = 0; // 初始化半徑

        // 循環尋找安全位置，或達到最大嘗試次數
        do {
            attempts++;
            initialRadius = getRandomInt(12, 18); // 每次嘗試確定半徑
            safeX = getRandomInt(initialRadius, canvas.width - initialRadius);
            safeY = getRandomInt(initialRadius, canvas.height - initialRadius);
            isSafe = true; // *** 假設本次嘗試是安全的 ***

            // 檢查與現有玩家細胞的距離
            for (const player of players) {
                if (player === this || player.isEaten || player.cells.length === 0) continue;
                for (const cell of player.cells) {
                    const dSq = distanceSq(safeX, safeY, cell.x, cell.y);
                    const minSafeDistSq = (cell.radius + initialRadius + SPAWN_SAFETY_BUFFER) ** 2;
                    if (dSq < minSafeDistSq) {
                        isSafe = false; // *** 發現不安全 ***
                        break;
                    }
                }
                if (!isSafe) break;
            }

            // 如果仍然安全，檢查與病毒的距離
            if (isSafe) {
                for (const virus of viruses) {
                    const dSq = distanceSq(safeX, safeY, virus.x, virus.y);
                    const minSafeDistSq = (virus.radius + initialRadius + SPAWN_SAFETY_BUFFER) ** 2;
                    if (dSq < minSafeDistSq) {
                        isSafe = false; // *** 發現不安全 ***
                        break;
                    }
                }
            }

        } while (!isSafe && attempts < MAX_SPAWN_ATTEMPTS);

        // *** 修改：檢查最終的 isSafe 狀態 ***
        if (!isSafe) {
            const reason = `LogicalPlayer ${this.name}: Could not find a safe spawn location after ${attempts} attempts. Map too crowded.`;
            console.warn(reason);
            triggerGameReset(reason); // *** 調用新的重置函數 ***
            return; // 阻止創建細胞
        } else {
            const initialCell = new PlayerCell(safeX, safeY, initialRadius, this);
            this.addCell(initialCell);
        }
        // 如果成功創建了細胞，這裡會正常結束
    }

    addCell(cell) {
        this.cells.push(cell);
        // No need to calculate mass here, do it in update or after operations
    }

    removeCell(cellToRemove) {
        const index = this.cells.indexOf(cellToRemove);
        if (index > -1) {
            this.cells.splice(index, 1);
        }
        // 重新計算質量
        this.calculateTotalMass();

        // *** 修改：僅在非分裂狀態且細胞為空時標記為死亡 ***
        if (this.cells.length === 0 && !this.isEaten && !this.isSplitting) {
            this.markAsEaten();
        }
    }

    findLargestCellMass() {
        if (this.cells.length === 0) {
            return 0;
        }
        // Using reduce to find the maximum mass
        return this.cells.reduce((maxMass, cell) => Math.max(maxMass, cell.mass), 0);

        /* Alternative loop version:
        let maxMass = 0;
        for (const cell of this.cells) {
            if (cell.mass > maxMass) {
                maxMass = cell.mass;
            }
        }
        return maxMass;
        */
    }

    calculateTotalMass() {
        this.totalMass = this.cells.reduce((sum, cell) => sum + cell.mass, 0);
    }

    findCenterOfMass() {
        if (this.cells.length === 0 || this.totalMass === 0) return { x: canvas.width / 2, y: canvas.height / 2 };
        let totalX = 0, totalY = 0;
        this.cells.forEach(cell => {
            totalX += cell.x * cell.mass;
            totalY += cell.y * cell.mass;
        });
        return { x: totalX / this.totalMass, y: totalY / this.totalMass };
    }

          
    // --- ADVANCED AI DECISION MAKING ---
    findAITarget() {
        this.aiUpdateCooldown = this.aiUpdateInterval;

        if (this.cells.length === 0) {
            this.aiTarget = null;
            return;
        }

        const center = this.findCenterOfMass();
        const viewRadius = 300 + Math.log1p(this.totalMass) * 50;
        const viewRadiusSq = viewRadius * viewRadius;

        // Reset perception variables for this frame
        let nearestFood = null, minDistFoodSq = viewRadiusSq * 1.2;
        let nearestThreatPlayerCenter = null, minDistThreatSq = viewRadiusSq; // Center of the nearest UNBLOCKED threat
        let nearestPreyPlayerCenter = null, minDistPreySq = viewRadiusSq;
        let nearestSafeVirus = null, minDistSafeVirusSq = viewRadiusSq * 0.5;
        let nearestOpportunityTarget = null, minDistOpportunitySq = viewRadiusSq;
        let nearestThreatToMyFragmentsCenter = null, minDistThreatToFragSq = viewRadiusSq;
        let targetVulnerableCell = null;
        let nearestDangerousVirus = null, minDistDangerousVirusSq = viewRadiusSq * 0.3;

        // --- Feeding Specific Variables ---
        let targetToFeedVirus = null; // Center of the player targeted for feeding
        let virusToFeed = null;       // The specific virus instance to feed
        let isHighPriorityFeed = false; // Flag for the "blocking" scenario feed
        let minDistToFeedableTargetSq = viewRadiusSq * (FEED_VIRUS_RANGE_FACTOR ** 2); // Track distance to feedable targets

        const largestOwnCell = this.getLargestCell(); // Get largest cell instance
        if (!largestOwnCell) return; // Should not happen if cells.length > 0, but safety
        const largestOwnCellMass = largestOwnCell.mass;
        const largestOwnCellRadius = largestOwnCell.radius;
        const ownSplitState = this.isSplitState();

        const canBeSplitMassThreshold = virusRadius * virusRadius * Math.PI * virusSplitMassThresholdMultiplier;
        const isSmallEnoughToHide = largestOwnCellMass < canBeSplitMassThreshold * 0.95;
        const isBigEnoughToSplit = largestOwnCellMass > canBeSplitMassThreshold;

        // --- Perception Loop (Iterate through other players) ---
        for (const other of players) {
            if (other === this || other.isEaten || other.cells.length === 0) continue;

            const otherCenter = other.findCenterOfMass();
            const dSqToCenter = distanceSq(center.x, center.y, otherCenter.x, otherCenter.y); // AI Center to Other Center

            if (dSqToCenter < viewRadiusSq) { // --- Player 'other' is in view ---
                const largestOtherCellMass = other.findLargestCellMass();
                const otherSplitState = other.isSplitState();
                let isVirusBlockingThisThreat = false;
                let specificBlockingVirus = null;

                // --- A: Threat Assessment & Blocking Check ---
                if (largestOwnCellMass > 0 && largestOtherCellMass / largestOwnCellMass > 1.25) { // Added safety check for largestOwnCellMass > 0
                    const isThreatBigEnoughToSplit = largestOtherCellMass > canBeSplitMassThreshold * 1.1;

                    // Check if a virus blocks this specific threat
                    if (isSmallEnoughToHide && isThreatBigEnoughToSplit) {
                        for (const virus of viruses) {
                            const distSqAtoV = distanceSq(center.x, center.y, virus.x, virus.y);
                            const distSqVtoT = distanceSq(virus.x, virus.y, otherCenter.x, otherCenter.y);
                            // Condition 1: Virus roughly between AI and Threat
                            if (distSqAtoV + distSqVtoT < dSqToCenter * 1.25) { // Slightly increased tolerance
                                // Condition 2: Virus close to the AI-Threat line
                                const Ax = center.x, Ay = center.y;
                                const Tx = otherCenter.x, Ty = otherCenter.y;
                                const Vx = virus.x, Vy = virus.y;
                                const dx = Tx - Ax, dy = Ty - Ay;
                                const lineLenSq = dx*dx + dy*dy;
                                let distSqToLine = Infinity;
                                if (lineLenSq > 0.001) {
                                    const t = ((Vx - Ax) * dx + (Vy - Ay) * dy) / lineLenSq;
                                    if (t >= -0.1 && t <= 1.1) { // Projection check
                                            const closestX = Ax + t * dx;
                                            const closestY = Ay + t * dy;
                                            distSqToLine = distanceSq(Vx, Vy, closestX, closestY);
                                    }
                                } else { distSqToLine = distSqAtoV; } // A and T are same point

                                const blockingToleranceSq = (virus.radius * 2.0) ** 2; // Use 2.0 multiplier

                                if (distSqToLine < blockingToleranceSq) {
                                    isVirusBlockingThisThreat = true;
                                    specificBlockingVirus = virus; // Store the specific virus
                                    // console.log(`${this.name}: Threat ${other.name} is BLOCKED by virus at (${virus.x.toFixed(0)}, ${virus.y.toFixed(0)})`);
                                    break; // Found a blocking virus for this threat
                                }
                            }
                        } // End virus loop for blocking check
                    } // End if small enough to hide

                    // If threat is NOT blocked, update nearestThreatPlayerCenter
                    if (!isVirusBlockingThisThreat) {
                        const otherLargestRadius = Math.sqrt(largestOtherCellMass / Math.PI);
                        // Re-evaluate distance conditions for fleeing if needed (edge proximity, etc.)
                        const fleeTriggerRadiusMultiplier = 1.6;
                        const threatDistanceSqThreshold = (otherLargestRadius * fleeTriggerRadiusMultiplier) ** 2;
                        const edgeProximityThreshold = 20;
                        const centerDistThresholdForEdge = largestOwnCellRadius + otherLargestRadius + edgeProximityThreshold;
                        const centerDistSqThresholdForEdge = centerDistThresholdForEdge ** 2;

                        if (dSqToCenter < Math.min(minDistThreatSq, threatDistanceSqThreshold) || dSqToCenter < centerDistSqThresholdForEdge) {
                            if (dSqToCenter < minDistThreatSq) { // Keep track of the closest unblocked threat
                                minDistThreatSq = dSqToCenter;
                                nearestThreatPlayerCenter = otherCenter;
                            }
                        }
                    }
                    // If threat IS blocked, we *don't* set nearestThreatPlayerCenter based on it.
                    // We will handle it in the feeding check below.

                } // --- End Threat Assessment ---

                // --- B: Feeding Opportunity Assessment ---
                const canFeed = AI_CAN_FEED_VIRUS && largestOwnCellMass >= MIN_MASS_TO_FEED_VIRUS && !ownSplitState;
                const isValidFeedTarget = largestOtherCellMass > canBeSplitMassThreshold * 1.1 && // Target big enough to split
                                            largestOtherCellMass > largestOwnCellMass * 0.7 && // Target not drastically smaller (relaxed from 0.7)
                                            dSqToCenter < minDistToFeedableTargetSq; // Target in range

                if (canFeed && isValidFeedTarget) {

                    // --- B1: High Priority - Feed the Blocking Virus? ---
                    if (isVirusBlockingThisThreat && specificBlockingVirus) {
                        // Check safety: Is the LARGEST cell far enough from THIS specific blocking virus?
                        const dSqLargestToBlockingVirus = distanceSq(largestOwnCell.x, largestOwnCell.y, specificBlockingVirus.x, specificBlockingVirus.y);
                        const edgeBuffer = 15; // Buffer between edges
                        const minSafeDistSq = (largestOwnCell.radius + specificBlockingVirus.radius + edgeBuffer) ** 2;

                        if (dSqLargestToBlockingVirus > minSafeDistSq) {
                            // Conditions met: Target is blocked by a specific virus, and we're safe from that virus.
                            console.log(`>>> HIGH PRIORITY Feed Trigger: ${this.name} targeting blocked ${other.name} via virus at (${specificBlockingVirus.x.toFixed(0)})`);
                            // Prioritize this feed action if it's closer than any previously found feed target
                            if (dSqToCenter < minDistToFeedableTargetSq) {
                                targetToFeedVirus = otherCenter;
                                virusToFeed = specificBlockingVirus;
                                isHighPriorityFeed = true;
                                minDistToFeedableTargetSq = dSqToCenter; // Update closest feed target distance
                            }
                        } else {
                                console.log(`High Priority Feed Aborted [${this.name}]: Largest cell too close to blocking virus (${specificBlockingVirus.x.toFixed(0)}).`);
                        }
                    }
                    // --- B2: Regular Feed Check (Only if no high-priority feed found YET) ---
                    // Only search for other viruses if we haven't already decided on a high-priority feed in this frame
                    else if (!isHighPriorityFeed && virusToFeed == null) {
                        for (const virus of viruses) {
                            // Avoid re-checking the blocking virus if it was deemed unsafe above
                            if (isVirusBlockingThisThreat && virus === specificBlockingVirus) continue;

                            // Safety Check: Largest cell vs current virus
                            const dSqLargestToVirus = distanceSq(largestOwnCell.x, largestOwnCell.y, virus.x, virus.y);
                            const edgeBuffer = 15;
                            const minSafeDistSq = (largestOwnCell.radius + virus.radius + edgeBuffer) ** 2;
                            const isSafeFromThisVirus = dSqLargestToVirus > minSafeDistSq;
                            const isInRange = dSqLargestToVirus < viewRadiusSq * (FEED_VIRUS_RANGE_FACTOR**2) * 0.9; // Check range relative to largest cell

                            if (isSafeFromThisVirus && isInRange) {
                                // Strategic Check 1: Virus close to AI(center)-Target(center) line?
                                const Ax = center.x, Ay = center.y;
                                const Tx = otherCenter.x, Ty = otherCenter.y;
                                const Vx = virus.x, Vy = virus.y;
                                // ... [calculate distSqToLineSegment as before] ...
                                let distSqToLineSegment = /* ... */ Infinity; // Replace with calculation
                                // Calculate distSqToLineSegment here (copy from previous versions)
                                const lineLenSqReg = (Tx - Ax)**2 + (Ty - Ay)**2;
                                if (lineLenSqReg > 0.001) {
                                    const tReg = ((Vx - Ax) * (Tx - Ax) + (Vy - Ay) * (Ty - Ay)) / lineLenSqReg;
                                    if (tReg >= -0.1 && tReg <= 1.1) {
                                        const closestXReg = Ax + tReg * (Tx - Ax);
                                        const closestYReg = Ay + tReg * (Ty - Ay);
                                        distSqToLineSegment = distanceSq(Vx, Vy, closestXReg, closestYReg);
                                    }
                                } else { distSqToLineSegment = distanceSq(Vx, Vy, Ax, Ay);}


                                const tolerance = virus.radius * 2.0; // Tolerance multiplier
                                const toleranceSq = tolerance * tolerance;
                                const isVirusOnLine = distSqToLineSegment < toleranceSq;

                                // Strategic Check 2: Target edge near this virus?
                                const distSqTargetToVirus = distanceSq(otherCenter.x, otherCenter.y, virus.x, virus.y);
                                const targetLargestRadius = Math.sqrt(largestOtherCellMass / Math.PI);
                                const targetEdgeNearVirusThreshold = virus.radius + targetLargestRadius * 0.7; // Threshold multiplier
                                const targetEdgeNearVirusThresholdSq = targetEdgeNearVirusThreshold ** 2;
                                const isTargetEdgeNear = distSqTargetToVirus < targetEdgeNearVirusThresholdSq;

                                if (isVirusOnLine && isTargetEdgeNear) {
                                    // Regular feed opportunity found
                                        console.log(`Regular Feed Opportunity Found: ${this.name} vs ${other.name} via virus ${virus.x.toFixed(0)}`);
                                        // Prioritize if closer than previous regular find
                                        if (dSqToCenter < minDistToFeedableTargetSq) {
                                            targetToFeedVirus = otherCenter;
                                            virusToFeed = virus;
                                            // isHighPriorityFeed remains false
                                            minDistToFeedableTargetSq = dSqToCenter;
                                        }
                                        break; // Found a suitable regular virus for this target
                                }
                            }
                        } // End regular virus search loop
                    } // End regular feed check conditional
                } // --- End Feeding Opportunity Assessment ---


                // --- C: Other Assessments (Prey, Opportunity, Threats to Fragments) ---
                // Run these ONLY if no feed action has been decided for this frame yet
                if (virusToFeed == null) {
                    // Check for Prey (Target is smaller)
                    if (largestOwnCellMass > largestOtherCellMass * 1.3) {
                        if (dSqToCenter < minDistPreySq) {
                            minDistPreySq = dSqToCenter;
                            nearestPreyPlayerCenter = otherCenter;
                        }
                    }

                    // Check for Opportunity Targets (Enemy split fragments)
                    if (otherSplitState) {
                        // ... [Opportunity target logic - check my largest cell vs their fragments] ...
                        for (const otherCell of other.cells) {
                            if (largestOwnCellMass > otherCell.mass * 1.15) {
                                const dSqToOtherCell = distanceSq(largestOwnCell.x, largestOwnCell.y, otherCell.x, otherCell.y); // Use largest cell distance
                                if (dSqToOtherCell < minDistOpportunitySq) {
                                        // Prioritize if much closer than regular prey
                                        if (dSqToOtherCell < minDistPreySq * 0.8) {
                                        minDistOpportunitySq = dSqToOtherCell;
                                        nearestOpportunityTarget = { x: otherCell.x, y: otherCell.y };
                                        }
                                }
                            }
                        }
                    }

                        // Check Threats to Own Fragments (if I am split)
                        if (ownSplitState) {
                            const vulnerableResult = this.findNearestVulnerableCellToThreat(otherCenter, largestOtherCellMass);
                            if (vulnerableResult.cell) {
                                const otherLargestRadius = Math.sqrt(largestOtherCellMass / Math.PI);
                                const threatToFragDistSq = (otherLargestRadius * 1.5)**2;
                                if (vulnerableResult.distSq < threatToFragDistSq && vulnerableResult.distSq < minDistThreatToFragSq) {
                                    minDistThreatToFragSq = vulnerableResult.distSq;
                                    nearestThreatToMyFragmentsCenter = otherCenter;
                                    targetVulnerableCell = vulnerableResult.cell;
                                }
                            }
                        }
                } // End conditional check (if virusToFeed == null)

            } // --- End Player 'other' in view ---
        } // --- End Perception Loop (Players) ---


        // --- Check Food (Simplified) ---
        if (virusToFeed == null && nearestPreyPlayerCenter == null && nearestOpportunityTarget == null) { // Only check food if no major targets
            for (const food of foods) { /* ... [existing food check logic] ... */
                    const dSq = distanceSq(largestOwnCell.x, largestOwnCell.y, food.x, food.y); // Use largest cell
                    if (dSq < viewRadiusSq && dSq < minDistFoodSq) {
                        minDistFoodSq = dSq;
                        nearestFood = food;
                    }
            }
        }

        // --- Check Viruses (for Hiding/Avoiding, independent of feeding decision) ---
            if (isBigEnoughToSplit) { // Check for dangerous viruses
                for (const virus of viruses) {
                    // Don't avoid the virus we intend to feed!
                    if (virus === virusToFeed) continue;

                    const dSq = distanceSq(largestOwnCell.x, largestOwnCell.y, virus.x, virus.y); // Use largest cell
                    if (dSq < minDistDangerousVirusSq) {
                        // More precise danger check: Is the virus *really* close to the edge?
                        const dangerDistSq = (largestOwnCellRadius + virus.radius + 10)**2; // Small buffer
                        if (dSq < dangerDistSq) {
                            minDistDangerousVirusSq = dSq;
                            nearestDangerousVirus = virus;
                            // console.log(`${this.name} identified dangerous virus at ${virus.x.toFixed(0)}`);
                        }
                        // Could add path prediction check here too
                    }
                }
            } else { // Check for safe viruses to hide near (only relevant if fleeing)
                for (const virus of viruses) {
                    const dSq = distanceSq(center.x, center.y, virus.x, virus.y); // Use center of mass for general hiding location
                    if (dSq < viewRadiusSq * 0.8 && dSq < minDistSafeVirusSq) {
                        minDistSafeVirusSq = dSq;
                        nearestSafeVirus = virus;
                    }
                }
            }


        // --- FINAL DECISION MAKING (Priority Order) ---

        // 1. Fleeing (Only if UNBLOCKED threat exists)
        if (nearestThreatPlayerCenter) {
            // Check if hiding near 'nearestSafeVirus' is viable (from fleeing logic)
            let fleeTargetX, fleeTargetY;
            let decidedToHide = false;
            if (isSmallEnoughToHide && nearestSafeVirus) { /* ... [Hiding logic during flee] ... */
                const distToVirusSq = distanceSq(center.x, center.y, nearestSafeVirus.x, nearestSafeVirus.y);
                const distToThreatSq = distanceSq(center.x, center.y, nearestThreatPlayerCenter.x, nearestThreatPlayerCenter.y);
                const minimumHidingDistSq = (largestOwnCellRadius + virusRadius + 10)**2;
                if (distToVirusSq < distToThreatSq * 0.4 && distToVirusSq > minimumHidingDistSq) { // Adjust factor?
                        const vX = nearestSafeVirus.x - center.x;
                        const vY = nearestSafeVirus.y - center.y;
                        const tX = center.x - nearestThreatPlayerCenter.x;
                        const tY = center.y - nearestThreatPlayerCenter.y;
                        if (vX * tX + vY * tY > 0) { // Virus roughly away from threat?
                        this.aiTarget = { x: nearestSafeVirus.x, y: nearestSafeVirus.y, type: 'hiding' };
                        // console.log(`--- ${this.name} Flee Decision: HIDING near virus ---`);
                        return; // Hiding is the decision
                        }
                }
            }

            // Default Flee (if not hiding)
            const fleeAngle = Math.atan2(center.y - nearestThreatPlayerCenter.y, center.x - nearestThreatPlayerCenter.x);
            const fleeDistance = viewRadius * 1.1; // Flee further
            fleeTargetX = center.x + Math.cos(fleeAngle) * fleeDistance;
            fleeTargetY = center.y + Math.sin(fleeAngle) * fleeDistance;
            fleeTargetX = Math.max(-canvas.width*0.2, Math.min(fleeTargetX, canvas.width*1.2)); // Allow going slightly off-screen
            fleeTargetY = Math.max(-canvas.height*0.2, Math.min(fleeTargetY, canvas.height*1.2));
            this.aiTarget = { x: fleeTargetX, y: fleeTargetY, type: 'fleeing' };
            // console.log(`--- ${this.name} Flee Decision: RUNNING from unblocked threat ---`);
            return; // Fleeing is the decision
        }

        // 2. Avoid Dangerous Virus (If I'm big enough to split and virus is too close)
        if (nearestDangerousVirus) {
            // Calculate avoidance target away from the dangerous virus
            const avoidAngle = Math.atan2(largestOwnCell.y - nearestDangerousVirus.y, largestOwnCell.x - nearestDangerousVirus.x);
            const avoidDistance = largestOwnCellRadius * 1.5; // Moderate distance
            let targetX = largestOwnCell.x + Math.cos(avoidAngle) * avoidDistance;
            let targetY = largestOwnCell.y + Math.sin(avoidAngle) * avoidDistance;
            targetX = Math.max(0, Math.min(targetX, canvas.width));
            targetY = Math.max(0, Math.min(targetY, canvas.height));
            this.aiTarget = { x: targetX, y: targetY, type: 'avoidingVirus' };
            // console.log(`--- ${this.name} Decision: AVOIDING dangerous virus ---`);
            return; // Avoiding virus is the decision
        }

        // 3. *** Execute Virus Feeding *** (If a target and virus were selected)
        if (virusToFeed && targetToFeedVirus) {
            console.log(`--- ${this.name} Decision: FEEDING virus at (${virusToFeed.x.toFixed(0)}) towards target (${targetToFeedVirus.x.toFixed(0)}) ${isHighPriorityFeed ? '(HIGH PRIORITY)' : ''} ---`);

            // Check mass again right before execution (could have changed)
            if (largestOwnCell.mass >= MIN_MASS_TO_FEED_VIRUS) {
                virusToFeed.triggerFlash();
                // Create pellet animation
                const pelletColor = this.color;
                feedPellets.push(new FeedPellet(largestOwnCell.x, largestOwnCell.y, virusToFeed.x, virusToFeed.y, PELLET_RADIUS, pelletColor));

                // Apply mass cost
                largestOwnCell.mass -= VIRUS_FEED_MASS_COST;
                largestOwnCell.setRadiusFromMass();
                this.calculateTotalMass();

                // Increment virus feed count
                virusToFeed.feedCount++;

                // Check for virus split and remove if necessary
                if (virusToFeed.feedCount >= VIRUS_MAX_FEED_COUNT) {
                    if (virusToFeed.splitTowards(targetToFeedVirus.x, targetToFeedVirus.y)) {
                            const index = viruses.indexOf(virusToFeed);
                            if (index > -1) viruses.splice(index, 1);
                            else console.error("Fed virus not found for removal!");
                    }
                }
            } else {
                    console.log(`Feed EXECUTION ABORTED [${this.name}]: Mass too low at execution time.`);
            }

            // Force immediate re-evaluation next frame
            this.aiTarget = null; // Clear any previous movement target
            this.aiUpdateCooldown = 0; // Trigger findAITarget next frame
            return; // Feeding action executed (or attempted)
        }

        // 4. Protect Fragments (If split and fragments threatened)
        if (ownSplitState && nearestThreatToMyFragmentsCenter && targetVulnerableCell) {
            this.aiTarget = { x: targetVulnerableCell.x, y: targetVulnerableCell.y, type: 'protecting' };
            // console.log(`--- ${this.name} Decision: PROTECTING fragment ---`);
            return;
        }

        // 5. Hunt Opportunity Target (Split enemy fragments)
        if (nearestOpportunityTarget) {
                this.aiTarget = { x: nearestOpportunityTarget.x, y: nearestOpportunityTarget.y, type: 'opportunisticHunt' };
                // console.log(`--- ${this.name} Decision: OPPORTUNISTIC HUNT ---`);
                return;
        }

        // 6. Hunt Regular Prey
        if (nearestPreyPlayerCenter) {
            this.aiTarget = { x: nearestPreyPlayerCenter.x, y: nearestPreyPlayerCenter.y, type: 'hunting' };
            // console.log(`--- ${this.name} Decision: HUNTING prey ---`);
            return;
        }

        // 7. Seek Food
        if (nearestFood) {
            this.aiTarget = { x: nearestFood.x, y: nearestFood.y, type: 'seekingFood' };
            // console.log(`--- ${this.name} Decision: SEEKING food ---`);
            return;
        }

        // 8. Assist Merging (If split and no other pressing action)
        if (ownSplitState && this.cells.length > 1) {
            const ownCenter = this.findCenterOfMass(); // Recalculate or use 'center'
            this.aiTarget = { x: center.x, y: center.y, type: 'mergingAssist' };
                // console.log(`--- ${this.name} Decision: MERGING ASSIST ---`);
            return;
        }

        // 9. Wander (Default)
        const targetDistSq = this.aiTarget ? distanceSq(center.x, center.y, this.aiTarget.x, this.aiTarget.y) : Infinity;
        // Only set a new wander target if no target exists, or current target is wander and we are close
        if (!this.aiTarget || (this.aiTarget.type === 'wandering' && targetDistSq < (150*150))) { // Increased wander distance threshold
                const wanderAngle = Math.random() * Math.PI * 2;
                const wanderDist = 200 + Math.random() * 300;
                let wanderX = center.x + Math.cos(wanderAngle) * wanderDist;
                let wanderY = center.y + Math.sin(wanderAngle) * wanderDist;
                wanderX = Math.max(50, Math.min(wanderX, canvas.width - 50)); // Keep wander target well within bounds
                wanderY = Math.max(50, Math.min(wanderY, canvas.height - 50));
                this.aiTarget = { x: wanderX, y: wanderY, type: 'wandering' };
                // console.log(`--- ${this.name} Decision: WANDERING ---`); // Reduce wander log spam
        } else if (this.aiTarget) {
            // Keep existing target if it's not 'wandering' or if it is 'wandering' but still far away
                // console.log(`--- ${this.name} Decision: Continuing Target (${this.aiTarget.type}) ---`);
        } else {
                // console.log(`--- ${this.name} Decision: NO TARGET (Should wander next?) ---`); // Should not happen often
        }

    } // --- End of findAITarget ---

    // 輔助方法：獲取最大細胞的實例 (如果需要)
    getLargestCell() {
        if (this.cells.length === 0) return null;
        return this.cells.reduce((largest, cell) => (cell.mass > largest.mass ? cell : largest), this.cells[0]);
    }

    findLargestCellRadius() {
        const mass = this.findLargestCellMass();
        return mass > 0 ? Math.sqrt(mass / Math.PI) : 0;
    }

    checkForMerges() {
        // Iterate backwards is safer when removing items
        for (let i = this.cells.length - 1; i > 0; i--) {
            for (let j = i - 1; j >= 0; j--) {
                // Add checks to ensure cells still exist in the array at these indices
                if (i >= this.cells.length || j >= this.cells.length) continue;

                const cellA = this.cells[i];
                const cellB = this.cells[j];

                // Basic validity checks
                if (!cellA || !cellB) continue;

                if (cellA.canMerge && cellB.canMerge) {
                    const dSq = distanceSq(cellA.x, cellA.y, cellB.x, cellB.y);
                    // *** Corrected merge distance calculation ***
                    // Merge if distance is less than sum_of_radii * factor
                    const mergeDist = (cellA.radius + cellB.radius) * MERGE_OVERLAP_FACTOR;

                    if (dSq < mergeDist * mergeDist) {
                        // console.log(`Merging cells for player ${this.name}`);
                        const bigger = cellA.mass >= cellB.mass ? cellA : cellB;
                        const smaller = cellA.mass < cellB.mass ? cellA : cellB;

                        bigger.mass += smaller.mass;
                        bigger.setRadiusFromMass();
                        bigger.resetMergeTimer();

                        this.removeCell(smaller); // removeCell handles mass update

                        // If cellA was the smaller one and got removed,
                        // we need to stop the inner loop for this 'i'
                        // because the outer loop index 'i' now points to a different element.
                        if (smaller === cellA) {
                            // Since we are iterating i downwards, removing cellA (at index i)
                            // means the next iteration of the outer loop (i-1) will correctly
                            // point to the element that was originally at i-1.
                            // So, just break the inner loop.
                            break; // Exit inner loop (j)
                        }
                        // If cellB (at index j) was removed, the inner loop continues correctly
                        // as j decrements.

                        // We modified the array, so it's often safer to break
                        // and let the next frame handle further merges if needed,
                        // but iterating backwards *should* handle this specific case.
                        // Let's keep iterating j downwards.
                    }
                }
            }
        }
    }

    splitCell(cellToSplit) {
        if (!this.cells.includes(cellToSplit) || this.isSplitting) { // 防止重複分裂或處理不存在的細胞
            return;
        }

        const numPieces = Math.min(playerSplitPieces, Math.max(2, Math.floor(cellToSplit.mass / playerSplitMinMassPerPiece)));
        if (numPieces < 2 || cellToSplit.mass <= 0) return;

        const massPerPiece = cellToSplit.mass / numPieces;
        const radiusPerPiece = Math.sqrt(massPerPiece / Math.PI);

        // *** 標記正在分裂 ***
        this.isSplitting = true;

        // 獲取分裂前的中心點和顏色，用於新細胞
        const splitX = cellToSplit.x;
        const splitY = cellToSplit.y;
        const splitColor = this.color; // 繼承顏色
        const splitName = this.name; // 繼承名字

        // 移除原始細胞
        this.removeCell(cellToSplit); // removeCell 內部已有長度檢查

        // console.log(`Splitting cell for ${this.name} into ${numPieces}`);
        const newCells = []; // 暫存新細胞
        for (let k = 0; k < numPieces; k++) {
            const angle = (k / numPieces) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            const burstMagnitude = cellToSplit.radius * 0.1 + Math.random() * playerSplitBurstSpeed; // 使用分裂前的半徑
            const offsetX = Math.cos(angle) * (radiusPerPiece * 0.5 + 1);
            const offsetY = Math.sin(angle) * (radiusPerPiece * 0.5 + 1);
            let newX = splitX + offsetX; // 基於原始細胞位置
            let newY = splitY + offsetY;
            newX = Math.max(radiusPerPiece, Math.min(newX, canvas.width - radiusPerPiece));
            newY = Math.max(radiusPerPiece, Math.min(newY, canvas.height - radiusPerPiece));

            // 創建新細胞，傳遞 this (LogicalPlayer) 作為 parent
            const newPiece = new PlayerCell(newX, newY, radiusPerPiece, this);
            newPiece.mass = massPerPiece;
            newPiece.setRadiusFromMass();

            newPiece.vx = Math.cos(angle) * burstMagnitude;
            newPiece.vy = Math.sin(angle) * burstMagnitude;
            newPiece.resetMergeTimer(); // 開始合併冷卻

            newCells.push(newPiece); // 先收集
        }

        // 將所有新細胞一次性添加到陣列
        this.cells.push(...newCells);

        // *** 取消分裂標誌 ***
        this.isSplitting = false;

        // 重新計算總質量
        this.calculateTotalMass();
    }

    // *** 新增：處理同玩家細胞間碰撞的方法 ***
    handleIntraPlayerCollisions() {
        if (!INTRA_PLAYER_COLLISION_ENABLED || this.cells.length < 2) {
            return; // 如果未啟用或細胞少於2個，則跳過
        }

        for (let i = 0; i < this.cells.length; i++) {
            for (let j = i + 1; j < this.cells.length; j++) {
                const cellA = this.cells[i];
                const cellB = this.cells[j];

                if (!cellA || !cellB) continue; // 基本檢查

                const dx = cellB.x - cellA.x;
                const dy = cellB.y - cellA.y;
                const distSq = dx * dx + dy * dy;
                const combinedRadius = cellA.radius + cellB.radius;

                // 檢查是否碰撞 (中心距離 < 半徑和)
                if (distSq < combinedRadius * combinedRadius && distSq > 0.001) { // 避免除以零
                    // 只有在至少一個細胞不能合併時才處理物理碰撞
                    if (!cellA.canMerge || !cellB.canMerge) {
                        const distance = Math.sqrt(distSq);
                        const overlap = combinedRadius - distance;

                        // 1. 分離重疊的細胞 (沿碰撞法線方向)
                        const nx = dx / distance; // 碰撞法線 x
                        const ny = dy / distance; // 碰撞法線 y
                        const separationFactor = 0.51; // 稍微多分開一點防止下次迭代仍重疊

                        cellA.x -= nx * overlap * separationFactor;
                        cellA.y -= ny * overlap * separationFactor;
                        cellB.x += nx * overlap * separationFactor;
                        cellB.y += ny * overlap * separationFactor;

                        // 2. 計算並應用碰撞反彈 (彈性碰撞)
                        this.resolveElasticCollision(cellA, cellB, nx, ny);

                        // 3. 碰撞縮小 (減少質量)
                        const massToShrinkA = cellA.mass * INTRA_PLAYER_SHRINK_RATE;
                        const massToShrinkB = cellB.mass * INTRA_PLAYER_SHRINK_RATE;

                        cellA.mass = Math.max(MINIMUM_CELL_MASS_AFTER_SHRINK, cellA.mass - massToShrinkA);
                        cellB.mass = Math.max(MINIMUM_CELL_MASS_AFTER_SHRINK, cellB.mass - massToShrinkB);

                        // 更新半徑
                        cellA.setRadiusFromMass();
                        cellB.setRadiusFromMass();

                        // 重要：碰撞後可能需要重置合併計時器嗎？
                        // 暫時不重置，讓它們繼續計時，否則可能永遠無法合併
                        // cellA.resetMergeTimer();
                        // cellB.resetMergeTimer();
                    }
                    // 如果兩個細胞都能合併 (cellA.canMerge && cellB.canMerge)，
                    // checkForMerges 方法會處理它們的合併，這裡不需要做任何事。
                }
            }
        }
        // 碰撞處理後，重新計算一次總質量（因為有縮小）
        // this.calculateTotalMass(); // 會在 update 的最後統一計算
    }

    // *** 新方法：應用同玩家細胞間的排斥力 ***
    applyIntraPlayerRepulsion() {
        if (!INTRA_PLAYER_REPULSION_ENABLED || this.cells.length < 2) {
            return;
        }

        for (let i = 0; i < this.cells.length; i++) {
            for (let j = i + 1; j < this.cells.length; j++) {
                const cellA = this.cells[i];
                const cellB = this.cells[j];

                if (!cellA || !cellB) continue;

                if (!cellA.canMerge || !cellB.canMerge) {
                    const dx = cellB.x - cellA.x;
                    const dy = cellB.y - cellA.y;
                    const distSq = dx * dx + dy * dy;
                    const combinedRadius = cellA.radius + cellB.radius;
                    const effectiveDist = combinedRadius * REPULSION_EFFECTIVE_DISTANCE_FACTOR;

                    if (distSq < effectiveDist * effectiveDist && distSq > 0.001) {
                        const distance = Math.sqrt(distSq);
                        const proximity = Math.max(0, 1 - (distance / effectiveDist));
                        let forceMagnitude = REPULSION_FORCE_MULTIPLIER * proximity * proximity;

                        // *** 修改時間衰減邏輯 ***
                        // 取兩個細胞中較小的剩餘時間
                        const minMergeTimer = Math.min(cellA.mergeTimer, cellB.mergeTimer);

                        let timeFadeFactor = 1.0; // 默認不衰減

                        // 檢查是否進入衰減窗口期
                        if (minMergeTimer <= REPULSION_FADE_WINDOW_MS && minMergeTimer > 0) {
                            // 在窗口期內，計算衰減比例 (從 1 線性下降到 MIN_FACTOR)
                            const fadeProgress = 1.0 - (minMergeTimer / REPULSION_FADE_WINDOW_MS); // 0 = 窗口開始, 1 = 窗口結束(timer=0)
                            timeFadeFactor = 1.0 - fadeProgress * (1.0 - REPULSION_MIN_FORCE_FACTOR);
                            timeFadeFactor = Math.max(REPULSION_MIN_FORCE_FACTOR, timeFadeFactor); // 確保不小於最小值
                        } else if (minMergeTimer <= 0) {
                             // 如果計時器已經結束，理論上 canMerge 會是 true，不應該進入這裡
                             // 但作為保險，如果進來了，設置為最小因子
                             timeFadeFactor = REPULSION_MIN_FORCE_FACTOR;
                        }
                        // 如果 minMergeTimer > REPULSION_FADE_WINDOW_MS，timeFadeFactor 保持為 1.0

                        forceMagnitude *= timeFadeFactor; // 應用時間衰減因子

                        // 計算力的方向
                        const nx = dx / distance;
                        const ny = dy / distance;

                        // 將力應用為加速度因子
                        const accelerationFactor = forceMagnitude;
                        cellB.vx += nx * accelerationFactor;
                        cellB.vy += ny * accelerationFactor;
                        cellA.vx -= nx * accelerationFactor;
                        cellA.vy -= ny * accelerationFactor;

                        // console.log(`Repulsion: Timer=${minMergeTimer.toFixed(0)}, FadeFactor=${timeFadeFactor.toFixed(2)}, Fmag=${forceMagnitude.toFixed(3)}`); // Debug
                    }
                }
            }
        }
    }

    update(deltaTime) {
        if (this.isEaten) { /* ... respawn logic ... */ return; }
        if (this.cells.length === 0) { this.markAsEaten(); return; }

        // 1. 更新 AI 目標
        this.aiUpdateCooldown -= deltaTime;
        if (this.aiUpdateCooldown <= 0) {
            this.findAITarget();
        }

        // *** 2. 應用同玩家細胞間的排斥力 ***
        // 在計算目標移動之前應用，這樣目標移動可以疊加在排斥之上
        this.applyIntraPlayerRepulsion();

        // 3. 更新所有細胞的位置和狀態 (基於 AI 目標 和 排斥力造成的速度變化)
        if (this.aiTarget) {
            this.cells.forEach(cell => cell.update(deltaTime, this.aiTarget));
        } else {
            this.cells.forEach(cell => cell.update(deltaTime, null));
        }

        // 4. 檢查是否可以合併 (在所有移動和力應用之後)
        if (this.cells.length > 1) {
            this.checkForMerges();
        }

        // 5. 重新計算總質量 (如果未來有其他質量變化邏輯，保留此處)
        this.calculateTotalMass();
    }

    draw() {
        // Draw cells from smallest to largest for correct overlap visual
        const sortedCells = [...this.cells].sort((a, b) => a.radius - b.radius);
        sortedCells.forEach(cell => cell.draw());
    }

    markAsEaten() {
        // 在標記前確保不在分裂過程中 (雖然 removeCell 已經檢查了，多一層保險)
       if (!this.isEaten && !this.isSplitting) {
           this.isEaten = true;
           this.respawnTimer = respawnDelay;
           this.cells = [];
           this.totalMass = 0;
           // console.log(`LogicalPlayer ${this.name} marked as eaten.`);
       }
    }

    respawn() {
        // 重生時確保 isSplitting 為 false
        this.isSplitting = false;
        // console.log(`LogicalPlayer ${this.name} respawning.`);
        this.isEaten = false;
        this.name = getNextName();
        this.color = getRandomColor(); // 重生時給新顏色和名字比較符合 Agar.io 習慣
        this.aiTarget = null;
        this.createInitialCell();
        this.calculateTotalMass();
    }
}

class PlayerCell {
    constructor(x, y, radius, parentPlayer) {
        this.parentPlayer = parentPlayer;
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.mass = Math.PI * radius * radius;
        this.setRadiusFromMass();

        this.vx = 0;
        this.vy = 0;
        // *** Use the new speed constant ***

        this.canMerge = false;
        this.mergeTimer = MERGE_COOLDOWN;
    }

    setRadiusFromMass() {
        this.radius = this.mass > 0 ? Math.sqrt(this.mass / Math.PI) : 0;
    }

    calculateSpeed() {
        return Math.max(0.3, cellBaseSpeedMultiplier - Math.log1p(this.radius * 0.04));
    }

    resetMergeTimer() {
        this.canMerge = false;
        this.mergeTimer = MERGE_COOLDOWN;
    }

    calculateSpeed() {
        // *** Use the new speed constants ***
        return Math.max(
            0.2, // Minimum speed
            cellBaseSpeedMultiplier - Math.log1p(this.radius * CELL_SPEED_MASS_FACTOR)
        );
    }

    update(deltaTime, parentTarget) {
        if (this.mass <= 0) {
            if (this.parentPlayer) this.parentPlayer.removeCell(this);
            return;
        }

        // *** 恢復合併計時器邏輯 ***
        if (!this.canMerge) {
             this.mergeTimer -= deltaTime;
             if (this.mergeTimer <= 0) {
                 this.canMerge = true;
                 // console.log(`Cell can merge now! Player: ${this.parentPlayer.name}, Timer ended.`); // 可以保留日誌用於確認
             }
         }
        // *** 結束恢復 ***

        // --- Movement ---
        const target = parentTarget;
        const timeFactor = deltaTime / 16.67;

        if (!target) {
           // ... (無目標移動) ...
            this.x += this.vx * timeFactor;
            this.y += this.vy * timeFactor;
            this.vx *= 0.95;
            this.vy *= 0.95;
            if (Math.abs(this.vx) < 0.01 && Math.abs(this.vy) < 0.01) { this.vx = 0; this.vy = 0;}

        } else {
           // ... (有目標移動) ...
            const targetX = target.x;
            const targetY = target.y;
            const angle = Math.atan2(targetY - this.y, targetX - this.x);
            const currentSpeed = this.calculateSpeed();
            const desiredVX = Math.cos(angle) * currentSpeed;
            const desiredVY = Math.sin(angle) * currentSpeed;

            const steerFactor = 0.01;
            this.vx += (desiredVX - this.vx) * steerFactor;
            this.vy += (desiredVY - this.vy) * steerFactor;

            this.x += this.vx * timeFactor;
            this.y += this.vy * timeFactor;
            this.vx *= 0.98;
            this.vy *= 0.98;
        }

        // 邊界碰撞
        this.x = Math.max(0, Math.min(this.x, canvas.width));
        this.y = Math.max(0, Math.min(this.y, canvas.height));
    }

    draw() {
        if (this.radius <= 0 || !this.parentPlayer) return; // 添加 parentPlayer 存在性檢查

        ctx.fillStyle = this.parentPlayer.color; // *** 使用父節點顏色 ***
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();

        const parentName = this.parentPlayer.name; // *** 使用父節點名字 ***
        if (parentName && this.radius > 15) {
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const baseFontSize = this.radius * 0.4;
            const fontSize = Math.max(10, Math.min(baseFontSize, 24));
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = Math.max(1, fontSize * 0.1);
            ctx.strokeText(parentName, this.x, this.y);
            ctx.fillText(parentName, this.x, this.y);
        }
    }
}

class Food { // Simplified - no Cell inheritance needed if static
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = foodRadius;
        this.color = getRandomColor();
        this.mass = Math.PI * this.radius * this.radius; // Keep mass for eating calc
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }
}

class Virus {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = virusRadius;
        this.originalColor = virusColor; // 儲存原始顏色
        this.color = this.originalColor; // 目前繪製顏色
        this.feedCount = 0;
        this.mass = Math.PI * this.radius * this.radius;
        this.spikeLength = this.radius * 0.2;
        this.spikeCount = virusSpikeCount;
        this.vx = 0;
        this.vy = 0;

        // --- 閃爍相關屬性 ---
        this.isFlashing = false;
        this.flashTimer = 0;
        this.flashDuration = 150; // 閃爍持續時間 (毫秒)
        this.flashColor = '#FFFFFF'; // 閃爍目標顏色 (例如：白色)
        this.flashInterval = 50; // 顏色交替速度 (毫秒)
        this._flashCycleTimer = 0; // 用於交替的內部計時器
    }

    // --- 觸發閃爍的方法 ---
    triggerFlash() {
        if (!this.isFlashing) { // 如果不在閃爍中，才觸發
            this.isFlashing = true;
            this.flashTimer = this.flashDuration;
            this._flashCycleTimer = this.flashInterval; // 開始顏色循環
            this.color = this.flashColor; // 立刻改變顏色以顯示效果
            // console.log(`Virus at (${this.x.toFixed(0)}) triggered flash.`); // 除錯用
        }
    }

    draw() {
        // --- 邊界檢查 (保持不變) ---
        if (this.x + this.radius + this.spikeLength < 0 || this.x - this.radius - this.spikeLength > canvas.width ||
            this.y + this.radius + this.spikeLength < 0 || this.y - this.radius - this.spikeLength > canvas.height) {
            return;
        }
        // --- 病毒主體 ---
        // 使用 this.color，這個顏色可能在 update 中被改變以達到閃爍效果
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        // --- 病毒尖刺 (顏色保持不變) ---
        ctx.strokeStyle = '#2ca32c'; // 尖刺維持深綠色
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < this.spikeCount; i++) {
            const angle = (i / this.spikeCount) * Math.PI * 2;
            const startX = this.x + Math.cos(angle) * this.radius * 0.95;
            const startY = this.y + Math.sin(angle) * this.radius * 0.95;
            const endX = this.x + Math.cos(angle) * (this.radius + this.spikeLength);
            const endY = this.y + Math.sin(angle) * (this.radius + this.spikeLength);
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
        }
        ctx.stroke();
    }

    // --- 分裂方法 (保持不變) ---
    splitTowards(targetX, targetY) {
        console.log(`Virus at (${this.x.toFixed(0)}, ${this.y.toFixed(0)}) splitting towards (${targetX.toFixed(0)}, ${targetY.toFixed(0)}) after ${this.feedCount} feeds!`);

       // 分裂計算不變...
        const angle = Math.atan2(targetY - this.y, targetX - this.x);
        const burstSpeed = virusRadius * 0.3;
        const newRadius = virusRadius * 0.8;
        const offsetX = Math.cos(angle) * (this.radius + newRadius) * 0.5;
        const offsetY = Math.sin(angle) * (this.radius + newRadius) * 0.5;
        let newX = this.x + offsetX;
        let newY = this.y + offsetY;
        newX = Math.max(newRadius, Math.min(newX, canvas.width - newRadius));
        newY = Math.max(newRadius, Math.min(newY, canvas.height - newRadius));

        const newVirus = new Virus(newX, newY);
        newVirus.radius = newRadius;
        newVirus.mass = Math.PI * newRadius * newRadius;
        newVirus.vx = Math.cos(angle) * burstSpeed;
        newVirus.vy = Math.sin(angle) * burstSpeed;

        viruses.push(newVirus);

        return true; // 表示成功分裂（用於移除舊病毒）
   }

   // ******** 正確放置的 update 方法 ********
   update(deltaTime) {
        // --- 閃爍邏輯 ---
        if (this.isFlashing) {
            this.flashTimer -= deltaTime;
            this._flashCycleTimer -= deltaTime;

            if (this._flashCycleTimer <= 0) {
                // 切換顏色
                this.color = (this.color === this.originalColor) ? this.flashColor : this.originalColor;
                this._flashCycleTimer = this.flashInterval; // 重置顏色切換計時器
            }

            if (this.flashTimer <= 0) {
                // 閃爍時間結束
                this.isFlashing = false;
                this.color = this.originalColor; // 確保恢復原始顏色
                // console.log(`Virus at (${this.x.toFixed(0)}) finished flash.`); // 除錯用
            }
        }
        // --- 閃爍邏輯結束 ---

        // --- 現有的移動邏輯 ---
        if (this.vx !== 0 || this.vy !== 0) {
            const timeFactor = deltaTime / 16.67;
            this.x += this.vx * timeFactor;
            this.y += this.vy * timeFactor;
            // 減速
            this.vx *= 0.95;
            this.vy *= 0.95;
            if (Math.abs(this.vx) < 0.1 && Math.abs(this.vy) < 0.1) {
                this.vx = 0; this.vy = 0;
            }
            // 邊界碰撞
            this.x = Math.max(this.radius, Math.min(this.x, canvas.width - this.radius));
            this.y = Math.max(this.radius, Math.min(this.y, canvas.height - this.radius));
        }
   }
   // ******** update 方法結束 ********
}


// --- Game Logic ---


function initGame() {
    console.log("Init: Starting game initialization.");

    // *** 1. 恢復 Body 背景色 (在移除 fade-out 之前) ***
    document.body.classList.remove('black-background');
    console.log("Init: Body background reset.");

    // *** 2. 遊戲元素淡入 ***
    gameElementToFade.classList.remove('fade-out');
    leaderboardElement.classList.remove('fade-out');
    console.log("Init: Fade-in triggered for game elements.");

    // *** 3. 重置狀態標誌 ***
    // 稍微延遲重置 isPausedForFade，確保淡入效果開始
    setTimeout(() => {
        isPausedForFade = false;
        console.log("Init: Game unpaused.");
    }, 50); // 短暫延遲後解除暫停
    isResettingGame = false; // 可以立即重置

    // --- 執行實際的遊戲初始化 ---
    resizeCanvas();
    players = [];
    foods = [];
    viruses = [];
    currentNameIndex = 0;
    nextPlayerId = 0;

    for (let i = 0; i < initialPlayerCount; i++) {
        players.push(new LogicalPlayer());
    }

    spawnFood(maxFoodCount);
    spawnVirus(initialVirusCount);

    lastTime = performance.now(); // 重置時間
    requestAnimationFrame(gameLoop); // 確保啟動循環
    console.log("Init: Game setup complete, loop requested.");
}

// *** 修改：觸發遊戲重置的函數 ***
function triggerGameReset(reason) {
    if (isResettingGame) {
        // console.log("Reset already in progress, ignoring trigger.");
        return;
    }

    isResettingGame = true;
    isPausedForFade = true; // *** 立即暫停遊戲邏輯 ***
    console.log(`****** ${reason} Resetting game... ******`);
    console.log("Reset: Pausing game logic.");

    // 1. 開始淡出遊戲元素
    gameElementToFade.classList.add('fade-out');
    leaderboardElement.classList.add('fade-out');
    console.log("Reset: Fade-out started for game elements.");

    // 2. 等待淡出完成
    setTimeout(() => {
        console.log("Reset: Fade-out complete.");
        // 3. 將背景變為黑色
        document.body.classList.add('black-background');
        console.log("Reset: Body background set to black.");

        // 4. 等待黑屏持續時間
        setTimeout(() => {
            console.log("Reset: Black screen duration ended. Initializing new game...");
            // 5. 執行遊戲初始化 (initGame 會處理淡入和解除暫停)
            initGame();
        }, BLACK_SCREEN_DURATION);

    }, FADE_DURATION); // 等待 CSS 淡出時間
}

function spawnFood(count) { /* ... (keep existing, maybe ensure not inside viruses/players?) ... */
    for (let i = 0; i < count; i++) {
        if (foods.length >= maxFoodCount) break;
        // Basic check to avoid spawning directly inside things
        let x, y, tooClose;
        let attempts = 0;
        do {
            tooClose = false;
            x = getRandomInt(0, canvas.width);
            y = getRandomInt(0, canvas.height);
            // Check viruses
            for(const v of viruses) {
                if (distanceSq(x, y, v.x, v.y) < (v.radius + foodRadius + 5)**2) {
                    tooClose = true; break;
                }
            }
            // Check player cells (less critical for food)
            // if (!tooClose) { ... }
            attempts++;
        } while (tooClose && attempts < 5);
        foods.push(new Food(x, y));
    }
}
function spawnVirus(count) { /* ... (keep existing logic) ... */
     for (let i = 0; i < count; i++) {
        let x, y, tooClose;
        let attempts = 0;
        const safeRadius = virusRadius + 10;
        do {
            tooClose = false;
            x = getRandomInt(safeRadius, canvas.width - safeRadius);
            y = getRandomInt(safeRadius, canvas.height - safeRadius);
            for (const v of viruses) { // Check other viruses
                if (distanceSq(x, y, v.x, v.y) < (virusRadius * 3)**2) {
                    tooClose = true; break;
                }
            }
             if (!tooClose) { // Check player cells
                  for (const lp of players) {
                      if (lp.isEaten) continue;
                      for (const pc of lp.cells) {
                          if (distanceSq(x,y,pc.x,pc.y) < (virusRadius + pc.radius + 30)**2) {
                             tooClose = true; break;
                          }
                      }
                      if (tooClose) break;
                  }
             }
            attempts++;
        } while (tooClose && attempts < 20);

        if (!tooClose) {
             viruses.push(new Virus(x, y));
        }
    }
}

// --- COLLISION DETECTION (Refactored) ---
function checkCollisions() {
    const eatenFoodIndices = new Set();
    const virusesToRemoveIndices = new Set();
    const cellsToSplit = []; // Store { cell: PlayerCell, virus: Virus }

    const allActiveCells = [];
    for (const player of players) {
        if (!player.isEaten) {
            allActiveCells.push(...player.cells);
        }
    }

    // 1. PlayerCell vs Food (Keep as is - center must be inside)
    for (let i = allActiveCells.length - 1; i >= 0; i--) {
        const cell = allActiveCells[i];
        if (!cell || !cell.parentPlayer || cell.parentPlayer.isEaten || !cell.parentPlayer.cells.includes(cell)) continue;
        const cellRadiusSq = cell.radius * cell.radius;
        for (let j = foods.length - 1; j >= 0; j--) {
            if (eatenFoodIndices.has(j)) continue;
            const food = foods[j];
            if (distanceSq(cell.x, cell.y, food.x, food.y) < cellRadiusSq) {
                cell.mass += food.mass;
                cell.setRadiusFromMass();
                eatenFoodIndices.add(j);
            }
        }
    }

    // 2. PlayerCell vs Virus (Split) - Looser Check
    const virusMassCheck = virusRadius * virusRadius * Math.PI * virusSplitMassThresholdMultiplier;
    for (let i = allActiveCells.length - 1; i >= 0; i--) {
        const cell = allActiveCells[i];
         if (!cell || !cell.parentPlayer || cell.parentPlayer.isEaten || !cell.parentPlayer.cells.includes(cell)) continue;

        if (cell.mass > virusMassCheck) { // Check mass first
            for (let j = viruses.length - 1; j >= 0; j--) {
                if (virusesToRemoveIndices.has(j)) continue;
                const virus = viruses[j];
                const dSq = distanceSq(cell.x, cell.y, virus.x, virus.y);

                // *** Looser split condition ***
                // Split if distance is less than player radius minus a fraction of virus radius
                const splitDist = Math.max(0, cell.radius - virus.radius * VIRUS_SPLIT_DISTANCE_FACTOR);
                if (dSq < splitDist * splitDist) {
                    cellsToSplit.push({ cell: cell, virus: virus });
                    virusesToRemoveIndices.add(j);
                    // Can potentially hit multiple viruses, so don't break inner loop necessarily
                }
            }
        }
    }

    // 3. PlayerCell vs PlayerCell (Eat) - Looser Check
    const cellsEatenThisFrame = new Set();
    for (let i = 0; i < allActiveCells.length; i++) {
        const cellA = allActiveCells[i];
         if (!cellA || !cellA.parentPlayer || cellA.parentPlayer.isEaten || cellsEatenThisFrame.has(cellA) || !cellA.parentPlayer.cells.includes(cellA)) continue;

        for (let j = i + 1; j < allActiveCells.length; j++) {
            const cellB = allActiveCells[j];
             if (!cellB || !cellB.parentPlayer || cellB.parentPlayer.isEaten || cellsEatenThisFrame.has(cellB) || !cellB.parentPlayer.cells.includes(cellB)) continue;

            if (cellA.parentPlayer.id !== cellB.parentPlayer.id) {
                const dSq = distanceSq(cellA.x, cellA.y, cellB.x, cellB.y);
                const rA = cellA.radius;
                const rB = cellB.radius;

                // *** Looser eating conditions ***
                // A eats B
                if (cellA.mass > cellB.mass * 1.15) { // Mass check first
                    const eatDistA = Math.max(0, rA - rB * PLAYER_EAT_DISTANCE_FACTOR); // Target distance based on radii and factor
                    if (dSq < eatDistA * eatDistA) {
                        cellA.mass += cellB.mass;
                        cellA.setRadiusFromMass();
                        cellB.parentPlayer.removeCell(cellB);
                        cellsEatenThisFrame.add(cellB);
                        continue; // B was eaten, move to next j
                    }
                }
                // B eats A
                if (cellB.mass > cellA.mass * 1.15) { // Mass check first
                     const eatDistB = Math.max(0, rB - rA * PLAYER_EAT_DISTANCE_FACTOR); // Target distance
                     if (dSq < eatDistB * eatDistB) {
                        cellB.mass += cellA.mass;
                        cellB.setRadiusFromMass();
                        cellA.parentPlayer.removeCell(cellA);
                        cellsEatenThisFrame.add(cellA);
                        break; // A was eaten, break inner loop for this i
                     }
                }
            }
        }
    }

    // --- Apply Changes ---
    foods = foods.filter((_, index) => !eatenFoodIndices.has(index));
    viruses = viruses.filter((_, index) => !virusesToRemoveIndices.has(index));
    cellsToSplit.forEach(item => {
        if (item.cell && item.cell.parentPlayer && !item.cell.parentPlayer.isEaten && item.cell.parentPlayer.cells.includes(item.cell)) {
             item.cell.parentPlayer.splitCell(item.cell);
        }
    });
}


function updateLeaderboard() { // Refactored for LogicalPlayer
    if (!leaderboardElement) return;
    const topPlayers = players
        .filter(p => !p.isEaten && p.totalMass > 0)
        .sort((a, b) => b.totalMass - a.totalMass)
        .slice(0, 10);

    let html = '<h3>Leaderboard</h3><ol>';
    if (topPlayers.length === 0) {
        html += '<li>Waiting for players...</li>';
    } else {
        topPlayers.forEach((player, index) => {
            const displayMass = Math.round(player.totalMass);
            const safeName = player.name.replace(/</g, "<").replace(/>/g, ">");
            html += `<li><span class="rank">${index + 1}.</span> ${safeName} <span class.mass">${displayMass}</span></li>`; // Fixed class name here
        });
    }
    html += '</ol>';
    leaderboardElement.innerHTML = html;
}

function resizeCanvas() { /* ... (keep existing) ... */
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// --- Main Game Loop ---
function gameLoop(timestamp) {
    // 檢查是否因淡出/黑屏而暫停
    if (isPausedForFade) {
        // 如果正在暫停，檢查背景是否需要保持黑色（雖然CSS應該處理了）
        // 並且只請求下一幀，不做任何事
        requestAnimationFrame(gameLoop);
        return;
    }
    // 檢查是否正在等待 initGame 完成 (isResetting 但 isPaused 已解除)
    if (isResettingGame) {
        console.log("Reset in progress (init pending), waiting...");
        requestAnimationFrame(gameLoop);
        return;
    }

    // --- 正常的遊戲循環邏輯 ---
    timestamp = timestamp || performance.now();
    let deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    if (deltaTime > MAX_DELTA_TIME) deltaTime = MAX_DELTA_TIME;
    if (deltaTime <= 0) { requestAnimationFrame(gameLoop); return; }

    // 1. Clear Canvas (只在非暫停狀態下清除)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Spawn Food & Viruses
    if (foods.length < maxFoodCount && Math.random() < 0.09) spawnFood(getRandomInt(1, 4));
    if (viruses.length < initialVirusCount && Math.random() < 0.009) spawnVirus(1);

    // 3. Update LogicalPlayers
    players.forEach(player => player.update(deltaTime));
    viruses.forEach(virus => virus.update(deltaTime));
    feedPellets = feedPellets.filter(pellet => pellet.update(deltaTime)); 

    // 4. Check Collisions
    checkCollisions();

    // 5. 檢查是否有細胞覆蓋地圖並重置
     if (RESET_ON_MAP_COVERAGE && !isResettingGame) { // 確保不在重置過程中觸發
        const smallerDimension = Math.min(canvas.width, canvas.height);
        const maxRadiusThreshold = smallerDimension * MAP_COVERAGE_RADIUS_FACTOR;
        let shouldReset = false;
        let winnerName = "Someone";

        for (const player of players) {
            if (player.isEaten) continue;
            for (const cell of player.cells) {
                if (cell.radius > maxRadiusThreshold) {
                    winnerName = player.name;
                    shouldReset = true;
                    break;
                }
            }
            if (shouldReset) break;
        }

        if (shouldReset) {
            const reason = `Game Over! ${winnerName} covered the map!`;
            triggerGameReset(reason);
            return; // 觸發重置後停止當前幀
        }
    }


    // 6. Maintain Minimum Player Count
     const activePlayerCount = players.filter(p => !p.isEaten).length;
     const neededPlayers = MIN_ACTIVE_PLAYERS - activePlayerCount;
     if (neededPlayers > 0 && !isResettingGame) { // 添加 !isResettingGame 檢查
         for (let i = 0; i < neededPlayers; i++) {
             players.push(new LogicalPlayer());
         }
     }


    // 7. Update Leaderboard
    leaderboardUpdateCooldown -= deltaTime;
    if (leaderboardUpdateCooldown <= 0) {
        updateLeaderboard();
        leaderboardUpdateCooldown = LEADERBOARD_UPDATE_INTERVAL;
    }

    // 8. Draw Objects
    foods.forEach(food => food.draw());
    viruses.forEach(virus => virus.draw());
    feedPellets.forEach(pellet => pellet.draw());
    const activePlayers = players.filter(p => !p.isEaten);
    activePlayers.forEach(player => player.draw());

    // 9. Request Next Frame
    requestAnimationFrame(gameLoop);
}


// --- Event Listeners ---
window.addEventListener('resize', resizeCanvas);

// --- Initialization ---
if (nameList && nameList.length > 0) {
    shuffleArray(nameList);
} else {
    console.warn("Embedded name list is empty. Using fallback.");
    nameList = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Iota", "Kappa"];
    shuffleArray(nameList);
}
document.addEventListener('DOMContentLoaded', initGame);