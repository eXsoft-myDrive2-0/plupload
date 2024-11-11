/**
 * 업로더 세팅.
 * 
 * @param data
 */
function document_setUploader(data) {
	$("#document_uploader").pluploadQueue({
		// General settings.
		dragdrop: false,	// '업무문서 등록'시 파일 추가 이벤트 불필요 : 드래그앤드롭 기능 차단
		runtimes: 'html5, flash, silverlight, html4',
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
						var file_id = item.fileId;
						var file_name = item.name;
						var file_size = item.contentSize;
						
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

				// 업로드된 상태로 정보 세팅.
				$(files).each(function(index, item) {
					item.loaded = item.size;
					item.percent = 100;		    
					item.status = plupload.DONE;
					item.ismyfile = true;
				});		
								
				setTimeout(function() {
					$("#uploader_filelist li").each(function(index, item) {
						// 업로드된 상태로 설정.
						$(item).removeClass("plupload_done");	
						$(item).addClass("plupload_uploaded");	
					});	
					
					// 파일 목록 Show.
        			$("#uploader_filelist").show();
        	    }, 100);
			},
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
        			// 업로드된 파일의 경우.
        			if (file.isUploaded) {	         				
        				setTimeout(function() {
        					// 업로드된 상태로 설정.
        					$("#" + file.id).removeClass("plupload_done");	    	
        					$("#" + file.id).addClass("plupload_uploaded");	
        					
        					// 삭제된 파일의 경우.
        					if (file.isDeleted) {
        						// 삭제 상태로 설정.
                    			$("#" + file.id).removeClass("plupload_uploaded");	    	
            					$("#" + file.id).addClass("plupload_restore");	
        					}
        					
        					// 최초에 현 이벤트가 두번 발생하는 것에 대한 workaround. (초기화시에 isInit이 true로 넘어오는 케이스에는 skip)
        					if (isInit == null) {
        						/*
        						// 삭제 아이콘에 클릭 이벤트 연결.
                        		$("#" + file.id + " .plupload_file_action a")
                        		.toggle(function() {
                        			// 삭제 상태로 설정.
                        			$("#" + file.id).removeClass("plupload_uploaded");	    	
                					$("#" + file.id).addClass("plupload_restore");	
                        			file.isDeleted = true;
                        		}, function() {
                        			// 미삭제 상태로 설정.
                        			$("#" + file.id).removeClass("plupload_restore");	    	
                					$("#" + file.id).addClass("plupload_uploaded");	
                        			file.isDeleted = false;    
                        		});    	
                        		*/
        						// '업무문서 등록'시 삭제 아이콘에 클릭 이벤트 불필요
                        		$("#" + file.id + " .plupload_file_action a").hide();
                        	}
        				}, 0);        				
        			}
        	    });     
            }
		}
	});
	// '업무문서 등록'시 파일 추가 이벤트 불필요
	$(".plupload_buttons").hide();
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
	var explorerFileIds = [];

	plupload.each(uploader.files, function(file) {
	
		if(file.ismyfile && !file.isDeleted){
			explorerFileIds.push(file.id);
		}
		
		// 추가 파일 목록 생성.
		if (!file.isUploaded) {	
			files.push({
				fileId: file.id,
				name: file.name
			});			
		}
    });
	
	// 컨텐트 등록 API 호출.
	apiExecute(
		"POST",
//		"/ExplorerDocument/insertDocument/"+contentModal.data("createType"),	// ExplorerDocumentController 폐기 예정
		"/documents/insertDragDropDocument/"+contentModal.data("createType"),	// 기존 컨트롤러 활용
		{		
			name: $("#document_name").val(),			
			docTypeId: $("#document_type").val(),			
			description: $("#document_description").val(),			
			aclId: $("#document_detail_acl").data("aclId"),			
			folderId: contentModal.data("folderId"),
			retention: parseInt($("#document_retention").val()),	
			attrs: attrs,
			files: files, 
			explorerFileIds : explorerFileIds
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