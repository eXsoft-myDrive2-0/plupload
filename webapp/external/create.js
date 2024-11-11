/**
 * 업로더 세팅.
 */
function document_setUploader() {
	$("#document_uploader").pluploadQueue({
		// General settings.
		runtimes: 'html5, flash, silverlight, html4',
		type: "POST",
		url: '../files/content',
		max_file_size: '1536mb',
		unique_names: true,

		// Flash settings.
		flash_swf_url: '../assets/plupload/js/plupload.flash.swf',

		// Silverlight settings.
		silverlight_xap_url: '../assets/plupload/js/plupload.silverlight.xap',
		
		// PreInit events, bound before any internal events.
		preinit: {
			Init: function(up, info) {	
				if (json_data.Document.files != null && json_data.Document.files.length > 0) {
					// 파일 목록 Hide.
					$("#document_uploader_filelist").hide();
					
					// 파일 목록 세팅.
					var files = [];
					$.each(json_data.Document.files, function(index, item) {
						var file_name = decodeURIComponent(item.name);
						var file_url = decodeURIComponent(item.path);
						var file_size = item.size;
						
						// 목록에 추가.
						var file = new plupload.File(generateUUID(), file_name, parseInt(file_size), file_url);
						files.push(file);
					});
					
					// 이벤트 발생하여 목록 갱신.
					up.trigger("FilesAdded", files);
					$("#document_uploader_filelist").show();
					$("#document_uploader_loading").show();
				}
			},
			PostInit: function(up) {
				external_files_download(up.files, function(files) {
					$.each(up.files, function(i, item) {
						$.each(files, function(j, jtem) {
							if (item.id == jtem.id) {
								item.isUploaded = jtem.isUploaded;
								item.loaded = (jtem.isUploaded) ? jtem.size : 0;
								item.percent = (jtem.isUploaded) ? 100 : 0;		    
								item.status = (jtem.isUploaded) ? plupload.DONE : plupload.FAILED;
								return false;
							}
						});
					});
					
					// 파일 목록 Show.
					up.trigger("QueueChanged", true);
					$("#document_uploader_loading").hide();
				});
			}
		},
		// Post init events, bound after the internal events.
		init: {		
			// 업로드 완료 시.
			UploadComplete: function(up, files) {
				// 컨텐트 Submit.
				document_submitContent();
            },
			QueueChanged: function(up, isInit) {
				plupload.each(up.files, function(file) {
					setTimeout(function() {
						if (file.path && !file.isUploaded) {
							$("#" + file.id).removeClass("plupload_done");
							$("#" + file.id).addClass("plupload_restore");
							$("#" + file.id + " a").remove();
						}
					}, 0);
				});
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
	var external_count = 0;
	$.each(uploader.files, function(index, item) {
		if (item.path) {
			external_count++;
		}
	});
	
	if ((uploader.files.length - external_count) > 0) {
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
		if (file.path) {
			if (file.isUploaded) {
				files.push({
					fileId: file.id,
					name: file.name
				});
			}
		} else {
			files.push({
				fileId: file.id,
				name: file.name
			});
		}
    });
	
	// 컨텐트 등록 API 호출.
	apiExecute(
		"POST",
		"/documents",		
		{		
			name: $("#document_name").val(),			
			docTypeId: "FW_DOCUMENT",	// 일반문서 유형		
			description: $("#document_description").val(),			
			aclId: $("#document_detail_acl_list input[type=radio][name=acl_list]:checked").val(),			
			folderId: $("#folder_tree_area").jstree('get_selected').attr('id'),			
			retention: parseInt($("#document_retention").val()),				// 무기한
			attrs: attrs,				// 일반문서 속성
			files: files
		},
		null,
		function(result) { 
			if (apiCompleted(result)) {	
				window.close();
			}
		},
		apiErrorOccurred,
		null			
	);
}