$(function()
{
    //はたの色設定
    const hata = [
        { displayName:"赤", color:"red", fontColor:"white" },
        { displayName:"黄", color:"yellow", fontColor:"black" },
        { displayName:"青", color:"blue", fontColor:"white" },
        { displayName:"黒", color:"black", fontColor:"white" },
        { displayName:"緑", color:"green", fontColor:"white" },
        { displayName:"ｵﾚﾝｼﾞ", color:"orange", fontColor:"black" },
        { displayName:"紫", color:"purple", fontColor:"white" },
        { displayName:"ピンク", color:"pink", fontColor:"black" },
        { displayName:"茶", color:"brown", fontColor:"white" },
        { displayName:"黄緑", color:"yellowgreen", fontColor:"black" },
        { displayName:"うす橙", color:"bisque", fontColor:"black" },
        { displayName:"うす紫", color:"mediumpurple", fontColor:"white" },
        { displayName:"灰", color:"gray", fontColor:"white" },
        { displayName:"水", color:"skyblue", fontColor:"black" },
    ];

    let hataDefaultIndex = 3; //はたのデフォルトの色(配列のインデックス)
    const janNums = [ 10,11,12,13,15,16,17,18,20,21,22,23,25 ]; //じゃーんの回数候補
    let janDefaultIndex = 5; //じゃーんのデフォルトの回数(janNumsのindexを指定)
    const lessonIds = [ "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫", "⑬", "⑭" ]; //各レッスンにつける記号番号
    //[...Array(14).keys()].map(i=>`(${++i})`); //適当な連番にしたいときはこんな感じで何個でもいける
    const lessonNum = lessonIds.length; //何セット分出力するか
    const printLessonNum = 14; //印刷するレッスン回数(14でピッタリA4ヨコ)
    const dateTimeHtml = "　  /　　(　　)<br/>AM/PM　　 ： 　"; //日時書き込み蘭(印刷用)

    const lessonModeIndexFlag = { kouhan:-1 }; //レッスン生成時にnewSoundIndexを計算するためのフラグ
    const lessonModes = [
        { name:"練習1(後半に1回)", index:lessonModeIndexFlag.kouhan, count:1 },
        { name:"練習2(後半で2回)", index:lessonModeIndexFlag.kouhan, count:2 },
        { name:"練習3(先頭以外で2回)", index:1, count:2 },
        { name:"練習4(先頭以外で3回)", index:1, count:3 },
        { name:"練習5(先頭以外で均等)", index:1, count:0 },
        { name:"練習6(ランダム)", index:0, count:0 },
    ];

    //音声ファイルのリスト
    //各色ごとに複数のファイル想定-->ランダムに再生
    const wavDir = "wav/";
    const wavFiles =
    [
        { color:"red", files: [{ path:"red1.wav" }, { path:"red2.wav" }] },
        { color:"yellow", files: [{ path:"yellow1.wav" }, { path:"yellow2.wav" }] },
        { color:"blue", files: [{ path:"blue1.wav" }, { path:"blue2.wav" }] },
        { color:"black", files: [{ path:"black1.wav" }, { path:"black2.wav" }] },
    ];

    // 内部で使う変数
    let janNum = 10; //じゃーんの回数->janNumsから選ばれる
    let hataColorNum = 1; //はたの色数設定値1〜14
    let newSoundIndex = 0; //新しい音がこのindex以降に入ってもよい
    let newSoundCount = 0; //新しい音がでる回数(0のときは他の音と均等にする)
    let highlightedHataColor = ""; //現在ハイライト中のはたのbackgroundColor
    let mt = new MersenneTwister(); //乱数(メルセンヌツイスター)
    let previousJanNum = janNum; //レッスンが生成されたときのjanNumを記憶

    //はたの候補を並べる
    function initHataButtons()
    {
        for(var i in hata)
        {
            $("#divhataColors").append(
                $("<span>", {class:`hataKouho ${hata[i].color}`,id:`color${i}`})
                .append( $("<input>", {type:"radio",name:"hataColors",id:`hc${i}`,value:i}) )
                .append( $("<label>", {for:`hc${i}`,text:hata[i].displayName}) ));
            $(`#color${i}`).css({
                "background-color": hata[i].color,
                "color": hata[i].fontColor,
                "border": `1px solid ${hata[i].borderColor}`});
        }
        $('input:radio[name="hataColors"]').eq(hataDefaultIndex).prop("checked",true);

        //span.hataKouho領域をタップしたらラジオボタンを選択する
        //trigger("click")したらradioやlabelをタップしたときに無限ループになるので注意
        $('.hataKouho').click(function(){
            $(this).find("input").prop("checked",true);//.change();
        });
    }

    //じゃーんラジオを並べる
    function initJanNumButtons()
    {
        //buttonでラジオを表示
        for(var j of janNums){
            $("#janButtons").append($("<button>",{type:"button",value:j,class:"janNumButton",text:`${j}回`}));
        }
        //文字に色をつける
        $("button.janNumButton[value='10']").addClass("fontOrange");
        $("button.janNumButton[value='11']").addClass("fontBlue");
        $("button.janNumButton[value='12']").addClass("fontBlue");
        $("button.janNumButton[value='13']").addClass("fontBlue");
        $("button.janNumButton[value='15']").addClass("fontBlue");
        $("button.janNumButton[value='21']").addClass("fontGreen");
        $("button.janNumButton[value='22']").addClass("fontGreen");
        $("button.janNumButton[value='23']").addClass("fontGreen");
        $("button.janNumButton[value='25']").addClass("fontGreen");

        //イベントハンドラ
        $(".janNumButton").click(function(){
            $(".janNumButton").removeClass("active");
            $(this).addClass("active");
            janNum = parseInt($(this).val());
        });

        //じゃーん回数ボタンのデフォルトを反映
        $(`button[value='${janNums[janDefaultIndex]}']`).trigger("click");
    }

    //配列をシャッフルする関数
    function shuffle(a){ return a.sort( () => mt.nextInt(0,2)-1); }

    //ユーザーの入力を読み込む
    //janNumはclickイベントで処理するのでここには書かない
    function loadSelectorValues(){　hataColorNum = 1+parseInt( $('input:radio[name="hataColors"]:checked').val()) ;　}
    
    //[0,1,･･･,(n-1)]の配列からk個重複無くとりだす
    function nCk(n, k){ return shuffle([...Array(n).keys()]).slice(0, k); }

    //index配列からhata配列への変換
    function mapIndexToHataArray(i){ return i.map(v => hata[v]); }

    //0...n-1までの数をk個、「均等に」持つ配列を作成する(シャッフル済)。
    //配列の先頭の要素がiであるものをreturnできる(オプション)
    function getIndexArray(n, k, i=null)
    {
        if(n==1){ return Array(k).fill(0); }
        let a = [];
        let q = Math.trunc(k/n);
        let r = k % n;
        if(q > 0){ a = Array(q).fill( [...Array(n).keys()] ); }
        if(r > 0){ Array.prototype.push.apply(a, nCk(n, r) ); }
        //先頭要素の指定が無ければshuffleしてreturnでOK
        if(i==null){ return shuffle(a.flat()); }
        //先頭要素の指定があれば、それを1個取り出して先頭に置き、残りをshuffleして結合
        else {
            a = a.flat();
            let b = a.splice(a.indexOf(i),1);
            if(b.length==0){ return a; } //指定の色が見つからないときには放置する仕様
            else{ return [i, ...shuffle(a)]; }
        }
    }

    //１レッスン分のはた配列を生成
    // firstHataId: 1個目の音をhata[index]で指定できる。nullなら指定なし
    function getLesson1(firstHataId)
    {
        //1色だけのときはべた塗りのレッスンをreturn(バグ回避)
        if(hataColorNum==1){ return Array(janNum).fill(hata[0]); }
        //完全にランダム化するときはそのまま返す
        if(newSoundCount==0 && newSoundIndex==0){ return mapIndexToHataArray(getIndexArray(hataColorNum,janNum,firstHataId)); }

        //最初に各はたが何回でるかを決めておく。
        //i:順番はランダムでないが、各音の回数は整っているindex配列にする。
        //newSoundIndexによって、適当に切り貼りとシャッフルを行って完成させる。
        let i = (newSoundCount>0)
            ? ((firstHataId == hataColorNum-1)
                ? [...getIndexArray(hataColorNum-1,janNum-newSoundCount), ...Array(newSoundCount).fill(hataColorNum-1)]
                : [...getIndexArray(hataColorNum-1,janNum-newSoundCount,firstHataId), ...Array(newSoundCount).fill(hataColorNum-1)] )
            : getIndexArray(hataColorNum,janNum,firstHataId);
        //うまく並べ替えてnewSoundIndex番目以降に新しい音が出るようにする。
        //実用上は問題なさそうだが、newSoundIndexとnewSoundCountを無茶な設定にするとバグるので必要なら修正を。
        i.splice(i.indexOf(firstHataId),1); //iからvalue:firstHataIdの要素を1個取り除く
        const c = i.filter(v => v == hataColorNum-1).length; //2番目以降での新しい音の個数を記録しておく
        let j = shuffle(i.filter(v => v < hataColorNum-1)); //新しい音を一旦取り除く
        //newSoundIndex以降に新しい音が出るように並べる
        //最初の指定色、newSoundIndex個の新しくない色、残りの新しい色を含んだものを並べて完成
        let k = [
            firstHataId,
            ...j.slice(0,newSoundIndex-1),
            ...shuffle([...j.slice(newSoundIndex-1), ...Array(c).fill(hataColorNum-1)]) ];
        return mapIndexToHataArray(k);
    }

    //先頭の音が均等になるようにレッスン全体の配列を作る
    //return: lesson hata array × レッスン数分の配列
    function getLessons()
    {
        //完全なランダムモード以外では、先頭に新しい色を入れないことにしている。
        //1色設定の時はバグ回避のためそのままにしておく
        const hcn = (newSoundIndex == 0 || hataColorNum == 1) ? hataColorNum : hataColorNum - 1;
        return getIndexArray(hcn,lessonNum).map( v => getLesson1(v) );
    }

    //全レッスン分のテーブル行を作成
    function showEntireLessons()
    {
        $("#hataLesson").empty(); //初期化
        let l = getLessons();
        let _list = $("<ul>", {id:"sortableLesson"});
        for(var i in l)
        {
            _list.append($("<li>",{class:(i>=printLessonNum)?"noprint":""})
                .append($("<table>",{class:"lesson",id:`tableLesson${i}`})
                .append($("<tbody>",{id:`tbody${i}`}))));
            let _numTr = $("<tr>",{class:"trLessonNum"})
                .append($("<td>",{rowspan:3,class:"tdlessonNum",title:i})
                    .append($("<div>",{class:"lessonNum",text:lessonIds[i]}))
                    .append($("<div>",{class:"divDateTime"}).html(dateTimeHtml)) );
            let _hataTr = $("<tr>",{class:"trHata"});
            let _kakikomiTr = $("<tr>",{class:"trKakikomi"});
            //arrayの個数(=janNum)の分だけ繰り返し
            for(var j=0;j<Math.max(...janNums);j++)
            {
                if(j<l[i].length){
                    _numTr.append($("<td>",{class:`tdJanNum ${l[i][j].color}`,text:parseInt(j)+1}));
                    let _td = $("<td>",{class:`tdHata ${l[i][j].color}`});
                        _td.css({ "background-color": l[i][j].color, "color": l[i][j].fontColor });
                        _td.append($("<div>",{class:"mask",text:l[i][j].displayName}));
                    _hataTr.append(_td);
                }
                else{ //janNumを超えた分は空欄を追加する(印刷用)
                    _numTr.append($("<td>",{class:"tdJanNum tdSpace",text:parseInt(j)+1}));
                    _hataTr.append($("<td>",{class:"tdHata tdSpace"}));
                }
                _kakikomiTr.append($("<td>")); //空欄の行を追加(印刷用)
            }
            _list.find(`#tbody${i}`).append(_numTr).append(_hataTr).append(_kakikomiTr);
        }
        //ハンドルを追加
        _list.find("tr.trLessonNum").append(
            $("<td>",{rowspan:2,class:"tdHandle"}).append($("<img>",{src:"images/drag.svg"})));
        //レッスンのtable全体を反映
        $("#hataLesson").append(_list);

        //ハタの各マスにハイライト機能を追加
        $('.tdHata').click(function(){
            highlightHata( hata[ hata.findIndex(e => e.displayName == $(this).text() ) ] );
        });

        //選んだレッスンtableをハイライトする
        $(".lessonNum").click(function(){
            $(this).closest("table").toggleClass("highlight");
            showResetHighlightButton();
        });

        //ハイライト表示リセットボタンの機能
        $('#resetHighlightButton').click(function(){
            resetHataHighlight();
            resetLessonHighlight();
            hideResetHighlightButton();
        });

        //並べ替え可能にする
        $("#sortableLesson").sortable({handle:".tdHandle"});
        $("#sortableLesson").disableSelection();

        showToggleHandleButton();
        showRefleshButton();
        resetLessonHighlight();
        resetHataHighlight();
        hideResetHighlightButton();
        previousJanNum = janNum;
    }

    //並び替えハンドルを表示・非表示するボタンを追加
    //繰り返しレッスンを生成するとハンドル表示切り替えボタンが機能しなくなるので、
    //最初の1回だけ実行する。
    let showToggleHandleButton = (function(){
        let executed = false;
        return function() {
            if (!executed) {
                executed = true;
                $('#buttonToggleHandle').removeClass("hidden");
                //並び替えハンドル表示切り替えボタンの機能
                $('#toggleHandleButton').click(function(){
                    $(".tdHandle").toggleClass("visible");
                });
            }
        };
    })();

    //ハイライト表示リセットボタンを追加
    function showResetHighlightButton(){ $('#buttonResetHighlight').removeClass("hidden"); }

    //ハイライト表示リセットボタンを隠す
    function hideResetHighlightButton(){ $('#buttonResetHighlight').addClass("hidden"); }

    function showRefleshButton(){ $("#buttonReflesh").removeClass("hidden"); }

    //function hideRefleshButton(){ $("#buttonReflesh").addClass("hidden"); }

    //ハタ色の強調表示をリセット
    function resetHataHighlight()
    {
        $(".tdHata,.tdJanNum").removeClass("transparent highlight");
        $(".tdJanNum").css({"background-color":"", "color":""});
        highlightedHataColor = "";
    }

    //レッスンのハイライト表示をリセット
    function resetLessonHighlight()
    {
        $(".lesson").removeClass("highlight");
        hideResetHighlightButton();
    }

    //クリックした色のはたをハイライトする
    function highlightHata(h)
    {

        //現在ハイライト中の色以外がクリックされたときはハイライト色を変更
        if(highlightedHataColor != h.color)
        {
            //リセット
            resetHataHighlight();
            $('.tdHata,.tdJanNum').addClass("transparent");
            $(`.tdHata.${h.color}`).removeClass("transparent");
            $(`.tdHata.${h.color},.tdJanNum.${h.color}`).addClass("highlight");
            $(`.tdJanNum.${h.color}`).css({"background-color":h.color,"color":h.fontColor});
            highlightedHataColor = h.color;
        }
        else{ resetHataHighlight(); }
        showResetHighlightButton();
    }

    //cookieのセット
    function setCookie()
    {
        $.cookie("hdi", hataColorNum-1, { expires:90 });
        $.cookie("jdi", janNums.findIndex(e => e == janNum), { expires:90 });
    }

    //cookie読み出し
    function loadCookie()
    {
        let hdi = parseInt($.cookie("hdi"));
        let jdi = parseInt($.cookie("jdi"));
        if(hdi != NaN && hdi >= 0 && hdi < hata.length ){ hataDefaultIndex = hdi; }
        if(jdi != NaN && jdi >= 0 && jdi < janNums.length ){ janDefaultIndex = jdi }
    }

    //練習作成ボタンを作る
    function initLessonButtons()
    {
        let _dom = $();
        lessonModes.map((m,i) => _dom = _dom.add($("<button>",{type:"button",class:"lessonMode",text:m.name,value:i})));
        $("#rensyuButtons").empty().append(_dom);
        //イベントハンドラを追加
        $("button.lessonMode").click(function()
        {
            loadSelectorValues();
            let selectedMode = lessonModes[parseInt(this.value)];
            newSoundIndex = (selectedMode.index === lessonModeIndexFlag.kouhan) ? Math.ceil(janNum/2) : selectedMode.index;
            newSoundCount = selectedMode.count;
            showEntireLessons();
            setCookie();
            $(".lessonMode").removeClass("active");
            $(this).addClass("active");
        });
    }

    //メニュー機能の初期化
    function initMenuFunctions()
    {
        //メインメニューの表示切り替え
        $('#toggleMainMenu').click(function(){
            $("#mainMenu").toggleClass("hidden");
            $("#toggleMainMenuChevron").toggleClass("vflip");
        });

        //更新ボタンの処理
        $("#refleshLesson").click(function(){
            //設定が変更されていたら元に戻す
            $('input:radio[name="hataColors"]').eq(hataColorNum-1).prop("checked",true);
            $(`button.janNumButton[value='${previousJanNum}']`).trigger("click");
            showEntireLessons();
            hideResetHighlightButton();
        });

        //再生メニュー表示ボタンの機能
        //音声ファイルを読み込んでおく
        $("#togglePlay").click(function(){
            loadWavFiles();
            $("#lessonMaker").toggleClass("hidden");
            $("#playButtons").toggleClass("hidden");
        });
    }

    //音声ファイルを読み込む(音声ボタンを押したときに1回だけ実行)
    //ボタン生成とそれに対応するイベントハンドラも追加しておく
    let loadWavFiles = (function(){
        let executed = false;
        let playingAudio = null;
        return function() {
            if (!executed) {
                executed = true;
                wavFiles.map(function(c,k){
                    //音声ファイルをロードする
                    c.files.map(function(f){
                        f.wav = new Audio(`${wavDir}${f.path}`);
                        f.wav.preload = "auto";
                        f.wav.volume = 1;
                        f.wav.load();
                        f.wav.addEventListener("play", function(e){ playingAudio = e.target; });
                        f.wav.addEventListener("ended", function(){
                            f.wav.pause();
                            f.wav.currentTime = 0;
                        }, false);
                    });
                    //ボタン生成
                    let wavButtons = $();
                    wavButtons = wavButtons.add($("<button>",{type:"button",class:"playButton",value:k,text:hata[k].displayName}))
                        .css({"background-color":hata[k].color, "color":hata[k].fontColor});
                    $("#playButtons").append(wavButtons);
                });
                //イベントハンドラ
                $(".playButton").click(function(){
                    if(playingAudio !== null){
                        playingAudio.pause();
                        playingAudio.currentTime = 0;
                    }
                    let i = parseInt(this.value);
                    let r = mt.nextInt(0, wavFiles[i].files.length);
                    wavFiles[i].files[r].wav.play();
                });
            }
        }
    })();

    //ページ初期化
    loadCookie();
    initHataButtons();
    initJanNumButtons();
    initLessonButtons();
    initMenuFunctions();
});

