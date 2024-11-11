/**
 * 업로더 세팅.
 * 
 * @param data : Drag&Drop 파일 객체
 */
function document_setUploader(data) {
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
				// 파일 목록 세팅.
				var files = [];
				
				// 첨부되어 있는 파일 목록.
				if (data != null && data.length > 0) {
					$.each(data, function(index, item) {
						var file_id = item.fileUUId;
						var file_name = item.name;
						var file_size = item.size;
						
						// 파일 객체 생성.
						var file = new plupload.File(file_id, file_name, parseInt(file_size));
						file.isUploaded = true;
						   
						// 목록에 추가.
						files.push(file);
					});	
				}
				
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
        			$("#uploader_filelist").show();
        	    }, 50);
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
				document_submitContent();
            }
		}
	});
}

/**
 * Submit.
 */
function document_fileUpload(data) {
	// 업로더.
	var uploader = $("#document_uploader").pluploadQueue();
	
	var successCnt = 0;
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
						document_dragDropFilesTempSave(item, file, function(){
							//Drag & Drop으로 들어온 데이터 업로드 완료라고 세팅하기
								successCnt++;
								// successCnt가 파일갯수와 일치하면 업로드 시작
								if (successCnt == data.length){
									if (uploader.files.length > 0) {
										// 파일 업로드.
										uploader.start();
									} else {
										// 컨텐트 Submit.
										document_submit();
									}
								}
						});
					}
				});
			}
	    });
	}
}

/**
 * 컨텐트 Submit.
 */
function document_submitContent() {
	// 속성 목록.
	var attrs = [];
	
	// 속성 정보 조회.
	$("#document_attrs .content_detail_content").each(function(index, item) {
		// 속성 정보 생성.
		var attr = {
			docTypeAttrId: null,
			value: ""
		};
		
		// 속성 태그 정보.
		var tag = $(item).contents();
		var first_tag = tag.first();

		// INPUT, TEXTBOX, COMBOBOX, PASSWORD의 경우.
		if (first_tag.is("input[type=text]") || first_tag.is("textarea") || first_tag.is("select") || first_tag.is("input[type=password]")) {
			attr.docTypeAttrId = first_tag.attr("id").replace("document_attr_", "");
			attr.value = first_tag.val();
		} 		
		// RADIOBUTTON의 경우.
		else if (first_tag.is("input[type=radio]")) {
			attr.docTypeAttrId = first_tag.attr("name").replace("document_attr_", "");

			$("input[type=radio]:checked", item).each(function(index, item) {
				attr.value = $(item).val();		
				
				return false;
			});	
		}
		// CHECKBOX의 경우.
		else if (first_tag.is("input[type=checkbox]")) {
			attr.docTypeAttrId = first_tag.attr("name").replace("document_attr_", "");
			
			$("input[type=checkbox]:checked", item).each(function(index, item) {
				attr.value += $(item).val() + ",";			
			});	

			attr.value = attr.value.match(/,$/) != null ? attr.value.slice(0, -1) : attr.value;
		} 
		
		// 속성 목록에 추가.
		attrs.push(attr);		
	});		

	// 파일 목록 생성.
	var uploader = $("#document_uploader").pluploadQueue();
	var files = [];
	//변경
	plupload.each(uploader.files, function(file) {
		files.push({
			fileId: file.id,
			name: file.name
		});
    });
	
	// 컨텐트 등록 API 호출.
	apiExecute(
		"POST",
		"/documents/insertDragDropDocument/"+contentModal.data("createType"),		
		{		
			name: $("#document_name").val(),			
			docTypeId: $("#document_type").val(),			
			description: $("#document_description").val(),			
			aclId: $("#document_detail_acl").data("aclId"),			
			folderId: contentModal.data("folderId"),
			retention: parseInt($("#document_retention").val()),	
			attrs: attrs,
			files: files
		},
		function(){
			createLoadingModal({
				message: "문서 등록 중입니다.",
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