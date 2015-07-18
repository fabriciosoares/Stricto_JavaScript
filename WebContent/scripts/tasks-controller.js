tasksController = function() {

	var taskPage;
	var initialised = false;

	function errorLogger(errorCode, errorMessage) {
		console.log(errorCode +':'+ errorMessage);
	}

	// (1) Criada a função que conta as linhas da tabela para alimentar o id "taskCount"
	// que está no arquivo 02-tasks.html
	function taskCounter() {
		var count = $(taskPage).find('#tblTasks tbody tr').length;
		storageEngine.findAll('task', function(tasks) {
			$.each(tasks, function(index, task) {
				// (4) Essa condicional retira do contador as tarefas que já estão com
				// a flag 'completo' marcada como true
				if(task.completo == true){
					count = count - 1;
				}
			});
		});
		$('footer').find('#taskCount').text(count);
	}

	// (3) A função "destacaCriticidade" avalia se a tarefa já está expirada
	// (caso afirmativo utiliza-se o css 'overdue'), ou se está próximo a data
	// prevista (como no exercício não estabelece esse prazo, eu estipulei 10 dias)
	// (caso afirmativo utiliza-se o css 'warning').
	// Esta função é chamada pelo loadTasks.
	function destacaCriticidade() {
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

				// (4) Função 'completeRow' marca a linha com a flag 'completo' e chama novamente o
				// 'loadTasks'
				$(taskPage).find('#tblTasks tbody').on('click', '.completeRow',
					function(evt) {
						storageEngine.findById('task', $(evt.target).data().taskId, function(task) {
							task.completo = true;
							storageEngine.save('task', task, function() {
								tasksController.loadTasks();
								// (4) Chama a função 'taskCounter', que conta as linhas da tabela e alimenta
								// o html, depois da marcação da tarefa completada.
								taskCounter();
							},errorLogger);
						}, errorLogger);
					}
				);

				$(taskPage).find('#tblTasks tbody').on('click', '.deleteRow', 
					function(evt) { 					
						storageEngine.delete('task', $(evt.target).data().taskId, function() {
							$(evt.target).parents('tr').remove();
							// (2) Chama a função 'taskCounter', que conta as linhas da tabela e alimenta
							// o html, depois da deleção da linha.
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
				// (5) Aplicado a função sort conforme solicitado no exercício.
				// Para tal finalidade foi utilizado o arquivo jquery 'jquery.dataTables.min.js',
				// que também aplicou na página as funções "Show - entries" que restringe
				// a quantidade de linhas na página;  "Search" que faz pesquisa dinâmica pelo
				// conteúdo das linhas da tabela;  A navegação "previous"/"next"; E uma função
				// que demonstra a quantidade de páginas processadas
				$(document).ready(function() {
					$('#tblTasks').dataTable( {
						"order": [[ 1, "desc" ]]
					});
				} );
				$.each(tasks, function(index, task) {
					if (task.id) {
						// (4) Caso a tarefa não tenha a flag 'completo' alimentada o sistema
						// marca como false.
						if (!task.completo) {
							task.completo = false;
						}
						$('#taskRow').tmpl(task).appendTo( $(taskPage).find( '#tblTasks tbody'));
						// (2) Chama a função 'taskCounter', que conta as linhas da tabela e alimenta
						// o html.
						taskCounter();
						// (3) Chama a função 'destacaCriticidade' que altera o css da linha da 
						// tabela, conforme orientado no enunciado do exercício.
						destacaCriticidade();
					}
				});
			}, 
			errorLogger);
		}
	}
}();