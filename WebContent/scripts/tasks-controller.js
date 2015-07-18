tasksController = function() {

	var taskPage;
	var initialised = false;

	function errorLogger(errorCode, errorMessage) {
		console.log(errorCode +':'+ errorMessage);
	}

	function taskCounter() {
		var count = $(taskPage).find('#tblTasks tbody tr').length;
		storageEngine.findAll('task', function(tasks) {
			$.each(tasks, function(index, task) {
				if(task.completo == true){
					count = count - 1;
				}
			});
		});
		$('footer').find('#taskCount').text(count);
	}

	function renderTable() {
		$.each($(taskPage).find('#tblTasks tbody tr'), function(idx, row) {
			var due = Date.parse($(row).find('[datetime]').text());
			if(due.compareTo(Date.today()) < 0) {
				$(row).addClass("overdue");
			} else if (due.compareTo((10).days().fromNow()) <= 0) {
				$(row).addClass("warning");
			}
		});
	}

	return {
		init : function(page) {
			if (!initialised) {

				taskPage = page;

				storageEngine.init(function() {
					storageEngine.initObjectStore('task', function() {}, 
					errorLogger) 
				}, errorLogger);

				$(taskPage).find( '[required="required"]' ).prev('label').append( '<span>*</span>').children( 'span').addClass('required');

				$(taskPage).find('tbody tr:even').addClass('even');

				$(taskPage).find( '#btnAddTask' ).click( function(evt) {
					evt.preventDefault();
					$(taskPage ).find('#taskCreation' ).removeClass('not');
				});
				
				$(taskPage).find('#tblTasks tbody tr' ).click(function(evt) {
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

				$(taskPage).find('#tblTasks tbody').on('click', '.completeRow',
					function(evt) {
						storageEngine.findById('task', $(evt.target).data().taskId, function(task) {
							task.completo = true;
							storageEngine.save('task', task, function() {
								tasksController.loadTasks();
								taskCounter();
							},errorLogger);
						}, errorLogger);
					}
				);

				$(taskPage).find('#tblTasks tbody').on('click', '.deleteRow', 
					function(evt) { 					
						storageEngine.delete('task', $(evt.target).data().taskId, function() {
							$(evt.target).parents('tr').remove();
							taskCounter();
						}, errorLogger);
					}
				);

				$(taskPage).find('#saveTask').click(function(evt) {
					evt.preventDefault();
					if ($(taskPage).find('form').valid()) {
						var task = $(taskPage).find('form').toObject();
						storageEngine.save('task', task, function() {
							tasksController.loadTasks();
							$(taskPage).find('form').fromObject({});
							$(taskPage).find('#taskCreation').addClass('not');
						}, errorLogger);
					}
				});
				initialised = true;
			}
    	},

		loadTasks : function() {
			$(taskPage).find('#tblTasks tbody').empty();
			storageEngine.findAll('task', function(tasks) {
				$(document).ready(function() {
					$('#tblTasks').dataTable( {
						"order": [[ 1, "desc" ]]
					});
				} );
				$.each(tasks, function(index, task) {
					if (task.id) {
						if (!task.completo) {
							task.completo = false;
						}
						$('#taskRow').tmpl(task).appendTo( $(taskPage).find( '#tblTasks tbody'));
						taskCounter();
						renderTable();
					}
				});
			}, 
			errorLogger);
		}
	}
}();