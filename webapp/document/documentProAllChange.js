/**
 * 업로더 세팅.
 */
function document_setUploader() {
	$("#document_uploader").pluploadQueue({
		// General settings.
		runtimes: 'html5, flash, silverlight, html4',
		type: "POST",
		url: '../files/content',
		//max_file_size: '2048mb',
		unique_names: true,

		// Flash settings.
		flash_swf_url: '../assets/plupload/js/plupload.flash.swf',

		// Silverlight settings.
		silverlight_xap_url: '../assets/plupload/js/plupload.silverlight.xap',
		
		// PreInit events, bound before any internal events.
		preinit: {
			Init: function(up, info) {	
			},

			UploadFile: function(up, file) {	
			}
		},
		
		// Post init events, bound after the internal events.
		init: {		
			// 업로드 완료 시.
			UploadComplete: function(up, files) {
				// 컨텐트 Submit.
				document_submitContent();
            }
		}
	});
}

/**
 * 파일 업로드
 */
function document_fileUpload() {
	// 업로더.
	var uploader = $("#document_uploader").pluploadQueue();

	// 첨부파일이 존재하는 경우.
	if (uploader.files.length > 0) {
		// 파일 업로드.
		uploader.start();
	} else {
		// 컨텐트 Submit.
		document_submitContent();
	}
	
	is_submit = true;
	return true;
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
	
	plupload.each(uploader.files, function(file) {
		files.push({
			fileId: file.id,
			name: file.name
		});
    });
	
	// 컨텐트 등록 API 호출.
	apiExecute(
		"POST",
		"/documents",		
		{		
			name: $("#document_name").val(),			
			keyWord: $("#document_keyWord").val(),
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