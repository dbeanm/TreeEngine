/*
Defines which plugins are available to the EDITOR
and sets up various properties
e.g.
CytogeneticsExtractor: {
		masks: [],
		display_name: "",
		enabled: false //whether it is enabled by default on load
	}
*/

const PluginConfig = {
	HaemTreatmentExtractor: {
		masks: ['Last progression less than 60d',
		'Lines of therapy',
		'Prior AntiCD38',
		'Prior Bortezomib',
		'Prior Imid',
		'Prior Ixazomib',
		'Prior Lenalidomide',
		'Prior PI',
		'Prior Pomalidomide',
		'Prior Alkylator',
		'Prior Bendamustine',
		'Refractory to Lenalidomide',
		'Refractory to PI',
		'Refractory to last treatment',
		'Relapse during last treatment',
		'Relapsed disease',
		'Response to any',
		'Response to last treatment',
		'Time from Prior Bortezomib less 6 months'],
		display_name: "Haematology treatment extractor",
		enabled: true,
		host: `http://${window.location.hostname}:5001/` //"http://treatmentplugin:5000/" //"http://localhost:5000/"
	},

	CytogeneticsExtractor: {
		masks: [
			'Number of cytogenetic abnormalities', 'Monosomy', 'Structural', 'abnormal(17p)', '-Y', 
			'-X', 'del11q', 'del12p', 'del13q', 'del5q', 'del7q', 'idic(X)(q13)', 'isochromosome17q', 
			'Monosomy13', 'Monosomy17', 'Monosomy5', 'Monosomy7', 't(1;3)', 't(11;16)(q23.3;p13.3)', 
			't(12p)', 't(17p)', 't(2;11)', 't(3;21)', 't(3;5)', 't(5;10)', 't(5;12)', 't(5;17)', 't(5;7)', 
			't(5q)', 't(1;22)', 'inv(3)', 't(3;3)', 't(6;9)', 't(9;22)', 't(16;16)', 'inv(16)', 't(8;21)', 
			't(15;17)', 't(9;11)', 't(6;11)', 't(10;11)', 't(v;11)'
		],
		display_name: "Cytogenetics extractor",
		enabled: true,
		host: `http://${window.location.hostname}:5002/`,
	},

	DummyExtractor: {
		masks: ["Number of cytogenetic abnormalities", "Lines of therapy"],
		display_name: "Dummy extractor",
		enabled: false,
		host: ""
	}
}

module.exports = {PluginConfig}