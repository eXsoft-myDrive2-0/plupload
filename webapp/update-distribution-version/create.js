/**
 * 컨텐트 수정.
 * 
 * @param key
 */
function distribution_selectContentDetailForUpdating() {	
	// 모달 세팅.
	contentModal.dialog({     
		title: $.i18n.prop("LABEL_UPDATE_VERSION"),
		buttons: [
			{ 
				text: $.i18n.prop("LABEL_OK"),
				click: function() {
					// Submit.
					//distribution_submit();
					//distribution_submit_version();
					distribution_plupload_submit_version();
				}
			}, 
			{
				text: $.i18n.prop("LABEL_CANCEL"),
				click: function() {
					// 모달 Close.
					contentModal.dialog("close");	
				}
			}
		]
	});
	
	// 모달 Show.
	contentModal.css("visibility", "visible");
	
	$("#document_uploader").pluploadQueue({
		// General settings.
		runtimes: 'html5, flash, silverlight, html4',
		url: '../files/content',
		max_file_size: '2048mb',
		unique_names: true,

		// Flash settings.
		flash_swf_url: '../assets/plupload/js/plupload.flash.swf',

		// Silverlight settings.
		silverlight_xap_url: '../assets/plupload/js/plupload.silverlight.xap',
		
		// 파일 다중 선택 비활성화
		multi_selection: false,

		// 초기화 설정
		init: {
			FilesAdded: function(up, files) {
				// 업로더에 추가된 파일이 하나를 초과하는 경우
				if (up.files.length > 1) {
					let i = up.files.length;
			        while (i--) {
			        	// 가장 최근에 추가된 파일을 제외하고 제거
			        	if (up.files[i].id !== files[0].id) {
			          		up.removeFile(up.files[i]);
			          	}
			        }
				}
			},
			// 업로드 완료 시.
			UploadComplete: function(up, files) {
				// 컨텐트 Submit.
				distribution_submitContent();
       		}
		}
	});
	
	// 업로더 추가 버튼 렌더링 fix
	$("#document_uploader_browse").css("position","");
	$("#document_uploader_browse").css("z-index","99999");
	$("#document_uploader > div[id$=html5_container]").css("z-index","99998");
}

/** PLUPLOAD 를 이용한 설치파일 버전 업데이트 */
let is_submit = false;
function distribution_plupload_submit_version() {
	if(is_submit == true){
		return;
	}
	
	let uploader = $("#document_uploader").pluploadQueue();
	let isSuccess = false;
	
	if(validate(uploader)){
		
		// 한개의 파일만 업로드 가능
		if (uploader.files.length == 1){
			// 파일 업로드.
			uploader.start();
		} else {
			// 컨텐트 Submit.
			isSuccess = distribution_submitContent();
		}
		
		is_submit = isSuccess == false ? false : true;
		return true;
	}
}

/**
 * 컨텐트 Submit.
 */
function distribution_submitContent() {
	// 파일 목록 생성.
	let uploader = $("#document_uploader").pluploadQueue();
	let files = [];
	
	plupload.each(uploader.files, function(file) {
		files.push({
			fileId: file.id,
			name: file.name
		});
    });
    
    // 컨텐트 등록 API 호출.
	apiExecute(
		"POST",
		"/distributions/versions/new",
		{		
			version: $("#distribution_version").val(),
			isApplied: $("#distribution_is_applied").prop('checked'),
			updateHistory: $("#distribution_description").val(),
			files: files
		},
		function(){
			createLoadingModal({
				message: "파일 등록 중입니다.",
				size: null
			});
		},
		function(result) { 
			if (apiCompleted(result)) {
				
				// Do Callback.
				var ok_callback = contentModal.data("params").ok_callback;
				if (typeof(ok_callback) == "function") {
					ok_callback();
				} else {
					// Refresh.
					refresh();
				}
			}
			// 모달 Close.
			closeModal(loadingModal);
			contentModal.dialog("close");
		},
		apiErrorOccurred,
		null			
	);
}
