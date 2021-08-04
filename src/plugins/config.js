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
		enabled: false,
		host: "http://treatmentplugin:5001/" //"http://localhost:5000/"
	},

	CytogeneticsExtractor: {
		masks: ["Number of cytogenetic abnormalities"],
		display_name: "Cytogenetics extractor",
		enabled: false,
		host: "http://cytogeneticsplugin:5002/"
	},

	DummyExtractor: {
		masks: ["Number of cytogenetic abnormalities", "Lines of therapy"],
		display_name: "Dummy extractor",
		enabled: true,
		host: ""
	}
}

module.exports = {PluginConfig}