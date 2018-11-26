/** pahooGeoCode.js
 * 住所・緯度・経度に関わるクラス
 *
 * @copyright	(c)studio pahoo
 * @author		パパぱふぅ
 * @動作環境	JavaScript ES6(ES2015)
 * @参考URL		http://www.pahoo.org/e-soul/webtech/js01/js01-09-01.shtm
 *
 * [利用するWebAPI]
 *  GoogleMaps Geocoding API
*/

// pahooGeoCodeクラス ========================================================
class pahooGeoCode {

/**
 * コンストラクタ
 * @param	なし
 * @return	なし
*/
constructor() {
	this.items  = new Array();		//検索結果格納用
	this.error  = false;			//エラーフラグ
	this.errmsg = '';				//エラーメッセージ
	this.hits   = 0;				//検索ヒット件数
	this.webapi = '';

	//Google API KEY
	//https://cloud.google.com/maps-platform/
	this.GOOGLE_API_KEY = '************************************';

	//Google Maps APIのスクリプト読み込み
	var key = this.GOOGLE_API_KEY;
	var url = 'https://maps.googleapis.com/maps/api/js?key=' + key + '&callback=drawMap&region=JP';
	var script = document.createElement('script');
	script.src = url;
	document.head.appendChild(script);
}

// Google Geocoding API(V3) ==================================================
/**
 * Google Geocoding API(V3) のURLを取得する(JSON)
 * @param	String query 検索キーワード（UTF-8）
 * @return	String URL 呼び出しURL
*/
getURL_GeoCodeAPI_V3(query) {
	var key = this.GOOGLE_API_KEY;
	var url = 'https://maps.googleapis.com/maps/api/geocode/json?key=' + key + '&language=ja&region=JP&address=' + encodeURI(query);
	return url;
}

/**
 * Google Geocoding API(V3) を用いて住所・駅名の緯度・経度を求める
 * @param	String query 検索キーワード
 * @param	Array  items 情報を格納する配列
 * @return	Integer ヒットした施設数
*/
getPointsV3_all(query, items) {
	var url = this.getURL_GeoCodeAPI_V3(query);	//リクエストURL
	this.webapi = url;
	var n = 0;

	//JSONデータ取得
	var req = new XMLHttpRequest();
	req.onreadystatechange = function() {
	    if (req.readyState == 4 && req.status == 200) {
			var json = JSON.parse(req.responseText);
			//レスポンス・チェック
			if (json.status.match(/ok/i) != null) {
				json.results.forEach(function(val) {
					var obj = new Object();
					obj.latitude  = val.geometry.location.lat;
					obj.longitude = val.geometry.location.lng;
					obj.address   = val.formatted_address;
					items.push(obj);
					n++;
				});
			} else {
				this.error  = true;
				this.errmsg = 'Google Geocoding API呼び出しに失敗';
			}
		} else {
			this.error  = true;
			this.errmsg = 'Google Geocoding APIが呼び出せない';
		}
	};
	req.open('GET', url, false);
	req.send(null);

	return n;
}

/**
 * 緯度経度文字列を分解する
 * @param	String str 緯度経度文字列
 * @return	Object {longitude:緯度, latitude:経度}
*/
parse_geo(str) {
	var re = /E(\d+)\.(\d+)\.(\d+)\.(\d+)N(\d+)\.(\d+)\.(\d+)\.(\d+)/i;
	var arr = str.match(re);
	for (var i = 1; i < parseInt(arr.length); i++) {
		arr[i] = parseInt(arr[i]);
	}
	var res = {
		longitude: arr[1] + arr[2] / 60 + arr[3] / 3600 + arr[4] / 36000,
		latitude:  arr[5] + arr[6] / 60 + arr[7] / 3600 + arr[8] / 36000
	}
	return res;
}

/**
 * Google Geocoding API(V3) を用いて住所・駅名の緯度・経度を検索
 * @param	String query 検索キーワード（UTF-8）
 * @return	Integer ヒットした地点数
*/
searchPoint(query) {
	this.items = [];		//結果を空にする
	this.hits = 0;

	//緯度・経度表記
	var re = /E(\d+)\.(\d+)\.(\d+)\.(\d+)N(\d+)\.(\d+)\.(\d+)\.(\d+)/i;
	if (query.match(re) != null) {
		var obj = new Object();
		var res = this.parse_geo(query);
		obj.latitude  = parseFloat(res.latitude);
		obj.longitude = parseFloat(res.longitude);
		obj.address   = '';
		this.items.push(obj);
		this.hits = 1;

	//Google Geocoding API使用
	} else {
		var n = this.getPointsV3_all(query, this.items);	//検索実行
		if (this.error) {
			this.hits = 0;
		} else if (n == 0) {
			this.error  = true;
			this.errmsg = '検索結果がない';
			this.hits = 0;
		} else {
			this.hits = n;
		}
	}

	return this.hits;
}

/**
 * 検索結果（緯度・経度）を取得
 * @param	Integer id 取得したい地点番号
 * @return	Object {longitude:緯度, latitude:経度, address:住所}
*/
getPoint(id) {
	var obj = new Object();
	if ((id = 0) || (id >= items.length)) {
		this.error  = true;
		this.errmsg = '不正な地点番号';
		obj = nul;
	} else {
		this.error  = false;
		this.errmsg = '';
		obj.latitude  = this.items[id].latitude;
		obj.longitude = this.items[id].longitude;
		obj.address   = this.items[id].address;
	}

	return obj;
}

// Googleマップ描画 ========================================================
/**
 * Googleマップを描く
 * @param	String  id        マップID
 * @param	Float   latitude  中心座標：緯度（世界測地系）
 * @param	Float   longitude 中心座標：経度（世界測地系）
 * @param	String  type      マップタイプ：HYBRID/ROADMAP/SATELLITE/TERRAIN
 * @param	Integer zoom      拡大率
 * @param	String  call      イベント発生時にコールする関数（省略可）
 * @param	Array   items[]   地点情報（省略可能）
 *					'title'       タイトル
 *					'description' 情報ウィンドウに表示する内容
 *					'latitude'    緯度
 *					'longitude'   経度
 *					'icon'        アイコンURL
 * @return	String Googleマップのコード
*/
drawGMap(id, latitude, longitude, type, zoom, items=null) {
	var map = new google.maps.Map(document.getElementById(id), {
		center: new google.maps.LatLng(parseFloat(latitude), parseFloat(longitude)),
		zoom: parseInt(zoom),
		mapTypeId: type,
		mapTypeControl: true,
		scaleControl: true
	});
    map.addListener('dragend', getPointData);
	map.addListener('zoom_changed', getPointData);
	map.addListener('maptypeid_changed', getPointData);

	//イベント発生時の地図情報を取得・格納
	function getPointData() {
		var point = map.getCenter();
		//経度
		if (document.getElementById('longitude') != null) {
			document.getElementById('longitude').value = point.lng();
		}
		//緯度
		if (document.getElementById('latitude') != null) {
			document.getElementById('latitude').value = point.lat();
		}
		//ズーム
		if (document.getElementById('zoom') != null) {
			document.getElementById('zoom').value = map.getZoom();
		}
		//地図タイプ
		if (document.getElementById('type') != null) {
			var type_g = map.getMapTypeId();
			const types = {'roadmap':'地図', 'satellite':'航空写真', 'hybrid':'ハイブリッド', 'terrain':'地形図'};
			for (var key in types) {
				if (key == type_g) {
					document.getElementById('type').value = key;
					break;
				}
			}
		}
	}

	if (items != null) {
		var n = items.length;
		items.forEach(function(item, i) {
			if (i <= 26) {			//'Z'を超えたらスキップ
				//マーカー
				var mark = String.fromCodePoint('A'.charCodeAt(0) + i);
				var icon_url = (typeof(item.icon) == 'undefined') ? 'https://www.google.com/mapfiles/marker' + mark + '.png' : item.icon;
				var marker = new google.maps.Marker({
					position: new google.maps.LatLng(item.latitude, item.longitude),
					icon: icon_url,
					map: map,
					title: item.title,
					zIndex: 100
				});
				var infowindow = new google.maps.InfoWindow({
					content: item.description,
					maxWidth: 200
				});
				google.maps.event.addListener(marker, 'click', function() {
					infowindow.open(map, marker);
				});
			}
		});
	}
}

// End of Class ===========================================================
}

/*
** バージョンアップ履歴 ===================================================
 *
 * @version  1.1  2018/11/17  drawGMap()追加，bug-fix
 * @version  1.0  2018/11/04
*/
