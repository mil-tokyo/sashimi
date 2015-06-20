var project_name = process.argv[2] || 'prime_list_maker_project';
var Project = require('./projects/' + project_name + '/' + project_name);

var project = new Project();
project.main();
