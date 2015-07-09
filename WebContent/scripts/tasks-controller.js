tasksController = function() {
	var taskPage;
	var initialised = false;   
	return {
		init : function(page) {
			if (!initialised) {

				taskPage = page;

				$(taskPage).find( '[required="required"]' ).prev('label').append( '<span>*</span>').children( 'span').addClass('required');

				$(taskPage).find('tbody tr:even').addClass( 'even');

				$(taskPage).find( '#btnAddTask' ).click( function(evt) {
					evt.preventDefault();
					$(taskPage ).find('#taskCreation' ).removeClass( 'not');
				});
				$(taskPage).find('tbody tr' ).click(function(evt) {
					$(evt.target ).closest('td').siblings( ).andSelf( ).toggleClass( 'rowHighlight');
				});
				
				$(taskPage).find('#tblTasks tbody').on('click', '.editRow', 
						function(evt) { 
							$(taskPage).find('#taskCreation').removeClass('not');
							storageEngine.findById('task', $(evt.target).data().taskId, function(task) {
								$(taskPage).find('form').fromObject(task);
							}, errorLogger);
						}
					);
				
				$(taskPage).find('#tblTasks tbody').on('click', '.deleteRow', 
					function(evt) { 					
						console.log('teste');
						storageEngine.delete('task', $(evt.target).data().taskId, 
							function() {
								$(evt.target).parents('tr').remove(); 
							}, errorLogger);
					}
				);
				
				$(taskPage).find('#saveTask').click(function(evt) {
					evt.preventDefault();
					if ($(taskPage).find('form').valid()) {
						var task = $(taskPage).find('form').toObject();		
						storageEngine.save('task', task, function() {
							$(taskPage).find('#tblTasks tbody').empty();
							tasksController.loadTasks();
							$(':input').val('');
							$(taskPage).find('#taskCreation').addClass('not');
						}, errorLogger);
					}
				});
				initialised = true;
			}
    	}
	}
}();