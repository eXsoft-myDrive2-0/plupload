/**
 * 업로더 세팅.
 *  @param data : Drag&Drop 파일 객체
 */
function file_setUploader(data) {
	$("#document_uploader").pluploadQueue({
		// General settings.
		runtimes: 'html5, flash, silverlight, html4',
		type: "POST",
		url: '../files/content',
		max_file_size: '2048mb',
		unique_names: true,

		// Flash settings.
		flash_swf_url: '../assets/plupload/js/plupload.flash.swf',

		// Silverlight settings.
		silverlight_xap_url: '../assets/plupload/js/plupload.silverlight.xap',
		
		// PreInit events, bound before any internal events.
		preinit: {
			Init: function(up, info) {	
				if (data != null && data.length > 0) {
					// 파일 목록 Hide.
					var files = [];
						$.each(data, function(index, item) {
							var file_id = item.fileUUId;
							var file_name = item.name;
							var file_size = item.size;
							// 파일 객체 생성.
							var file = new plupload.File(file_id, file_name, parseInt(file_size));							//file.isUploaded = true;
							// 목록에 추가.
							file.isUploaded = true;
							files.push(file);
						});	
						// 파일 목록 Hide.
						$("#uploader_filelist").hide();
						// 이벤트 발생하여 목록 갱신.
						up.trigger("FilesAdded", files);
						up.trigger("QueueChanged", true);
						
						setTimeout(function() {
							$("#uploader_filelist li").each(function(index, item) {
								// 업로드된 상태로 설정.
								$(item).removeClass("plupload_done");	
								$(item).addClass("plupload_uploaded");	
							});	
							
							// 파일 목록 Show.
		        			$("#document_uploader_filelist").show();
		        	    }, 50);
				}
			},
		},
		
		// Post init events, bound after the internal events.
		init: {	
			BeforeUpload : function(up, file) {
				//isUploaded (Drag&Drop 파일인 경우 plupload에서 업로드하지 않는다 - file_submit에서 임시파일로 저장됨)
				if(file.isUploaded) {
					//임시파일로 이미 저장되었기 때문에 status만 DONE으로 변경하며 통신은 발생하지 않도록 skip(return false)
					setTimeout(function() {
						file.loaded = file.size;
						file.percent = 100;	
						file.status = plupload.DONE;
					 }, 0);
					//목록 갱신.
					setTimeout(function() {
						up.trigger("FileUploaded", up.files);
					}, 50);
					return false;
				}
			},
			// 업로드 완료 시.
			UploadComplete: function(up, files) {
				// 컨텐트 Submit.
				file_submitContent();
            }
		}
	});
}

/**
 * Submit.
 */
function file_submit(data) {
	// 폴더 선택 여부
	if(!contentModal.data("folderId")){
		createMessageModal({
			title: null,
			type: "warning",
			message: $.i18n.prop("SELECT_FOLDER"),			
			ok_callback: null,
			size: null
		});
		
		return;
	}
	
	// 업로더.
	var uploader = $("#document_uploader").pluploadQueue();
	
	var askFileCnt = 0; //Drag&Drop으로 들어온 파일을 document_dragDropFilesTempSave로 요청할 건 수
	//Drag&Drop으로 들어온 파일 검사
	if (data != null && data.length > 0) {
		plupload.each(uploader.files, function(file) {
			/*
			 * file.isUploaded = true : Drag&Drop으로 들어온 파일
			 * data : Drag&Drop으로 들어온 파일 리스트
			 * uploader.files : pluploadQueue에서 넘어온 파일 리스트(Drag&Drop+수동등록)
			 */ 
			if(file.isUploaded){
				askFileCnt++;
			}
		});
	}
	
	
	var sucFileCnt = 0; //Drag&Drop으로 들어온 파일을 document_dragDropFilesTempSave로 완료된 건 수
	if (data != null && data.length > 0) {
		plupload.each(uploader.files, function(file) {
			/*
			 * file.isUploaded = true : Drag&Drop으로 들어온 파일
			 * data : Drag&Drop으로 들어온 파일 리스트
			 * uploader.files : pluploadQueue에서 넘어온 파일 리스트(Drag&Drop+수동등록)
			 */ 
			
			if(file.isUploaded){
				// Drag&Drop으로 들어온 파일은 document_dragDropFilesTempSave 통해서 임시파일을 저장한다.
				$.each(data, function(index, item) {
					if(item.fileUUId==file.id){
						file_dragDropFilesTempSave(item, file, function(){
							sucFileCnt++;
							
							//Drag&Drop 파일이 있는 경우 완료 건수와 일치할 때 uploader.start
							if (askFileCnt == sucFileCnt) {
								uploaderStart(uploader); //업로더 파일전송
							}
						});
					}
				});
			}
	    });
	}

	//Drag&Drop 파일이 없는 경우
	if (askFileCnt == 0) {
		uploaderStart(uploader); //업로더 파일전송
	}
	
}

/**
 * 컨텐트 Submit.
 */
function file_submitContent() {
	// 파일 목록 생성.
	var uploader = $("#document_uploader").pluploadQueue();
	var files = [];
	
	plupload.each(uploader.files, function(file) {
		files.push({
			fileId: file.id,
			name: file.name
		});
    });

	// 컨텐트 등록 API 호출.
	apiExecute(
		"POST",
		"/explorerFile/insertFileForWeb",		
		{		
			folderId: contentModal.data("folderId"),			
			files: files
		},
		function(){
			createLoadingModal({
				message: "파일 저장 중입니다.",
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