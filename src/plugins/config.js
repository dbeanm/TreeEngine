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
		masks: ['Prior alkylator',
		'Prior antiBCMA',
		'Prior antiCD38',
		'Prior ASCT',
		'Prior ASCT interval days',
		'Prior bortezomib',
		'Prior bortezomib 1st line',
		'Prior bortezomib interval months',
		'Prior carfilzomib',
		'Prior daratumumab',
		'Prior daratumumab pre-transplant induction',
		'Prior Imid',
		'Prior isatuximab',
		'Prior isatuximab EAMS',
		'Prior isatuximab Sanofi early access',
		'Prior ixa_len_dex',
		'Prior ixazomib',
		'Prior lenalidomide',
		'Prior lenalidomide at least 2 cycles',
		'Prior lenalidomide pre-transplant induction',
		'Prior lines of therapy',
		'Prior PI',
		'Prior PI at least 2 cycles',
		'Prior pomalidomide',
		'Prior thalidomide',
		'Progressive myeloma',
		'Recent ASCT',
		'Refractory to last line',
		'Refractory to prior antiCD38',
		'Refractory to prior bortezomib',
		'Refractory to prior lenalidomide',
		'Refractory to prior PI',
		'Refractory to prior pomalidomide',
		'Responded to 1st line treatment',
		'Responded to at least one prior line',
		'Responded to prior bortezomib',
		'Responded to prior daratumumab',
		'Response then relapse to prior line'],
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