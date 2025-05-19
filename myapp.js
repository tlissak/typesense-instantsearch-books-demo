const INDEX_NAME = 'books';
const STOP_WORDS = ['a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'if', 'in', 'into', 'is', 'it', 'no', 'not', 'of', 'on', 'or', 'such', 'that', 'the', 'their', 'then', 'there', 'these', 'they', 'this', 'to', 'was', 'will', 'with'];
const MIN_LENGTH = 1 ;
const DEBOUNCE_TIME = 100 //ms

const anchorParams = new Proxy(
    new URLSearchParams(window.location.hash.replace("#", "")),
    {
        get: (anchorParams, prop) => anchorParams.get(prop),
    }
);

let TYPESENSE_SERVER_CONFIG = {
    apiKey: 'IVM976nk6A1ODjXMYoigUqMSQ6OSIFZ2', // Be sure to use an API key that only allows searches, in production
    nodes: [
        {
            host: '192.168.0.55',
            port: '8108',
            protocol: 'http',
        },
    ],
    numRetries: 8,
    useServerSideSearchCache: false,
};

let conf = {
    server:{
        ...TYPESENSE_SERVER_CONFIG
    },
    // The following parameters are directly passed to Typesense's search API endpoint.
    //  So you can pass any parameters supported by the search endpoint below.
    //  queryBy is required.
    //  filterBy is managed and overridden by InstantSearch.js. To set it, you want to use one of the filter widgets like refinementList or use the `configure` widget.
    additionalSearchParameters: {
        queryBy: 'title,authors',
        facet_sample_threshold: 1000,
        facet_sample_percent: 20,
    },
};

//console.log(conf);

const typesenseInstantsearchAdapter = new TypesenseInstantSearchAdapter(    conf );

const searchClient = typesenseInstantsearchAdapter.searchClient;



//console.log(InstantSearch);

async function getIndexSize() {

    let results ={ found: 0}
/*
    const search = instantsearch({
        searchClient,
        indexName: INDEX_NAME,

        routing: {
            router: instantsearch.routers.history({ cleanUrlOnDispose: true }),
        },
        onStateChange({ uiState, setUiState }) {
            if (uiState[INDEX_NAME].query === "") {
                document.querySelector("#results-section").classList.add("d-none");
            } else {
                document.querySelector("#results-section").classList.remove("d-none");
                setUiState(uiState);
            }
        },
        future: {
            preserveSharedStateOnUnmount: true,
        },
    });


    let typesenseSearchClient = new typesense.TypesenseSearchClient({
        ...TYPESENSE_SERVER_CONFIG,
        useServerSideSearchCache: true,
    });


/*
    let typesenseSearchClient = new TypesenseSearchClient({
        ...TYPESENSE_SERVER_CONFIG,
        useServerSideSearchCache: true,
    });

 */




  //  let results = await searchClient2
 //       .collections(INDEX_NAME)
 //       .documents()
  //      .search({ q: "*" });
    //console.log(results);
    return results["found"];
}

let indexSize;

(async () => {
    indexSize = await getIndexSize();
})();

/*
 curl 'http://localhost:8108/keys' \
    -X POST \
    -H "X-TYPESENSE-API-KEY: ${TYPESENSE_API_KEY}" \
    -H 'Content-Type: application/json' \
    -d '{"description":"Search-only companies key.","actions": ["documents:search"], "collections": ["companies"]}'
*/

function queryWithoutStopWords(query) {
    const words = query.replace(/[&/\\#,+()$~%.':*?<>{}]/g, "").split(" ");
    return words
        .map((word) => {
            if (STOP_WORDS.includes(word.toLowerCase())) {
                return null;
            } else {
                return word;
            }
        })
        .filter((w) => w)
        .join(" ")
        .trim();
}

const search = instantsearch({
    searchClient,
    indexName: INDEX_NAME,

    routing: {
        router: instantsearch.routers.history({ cleanUrlOnDispose: true }),
    },
    onStateChange({ uiState, setUiState }) {
        if (uiState[INDEX_NAME].query === "") {
            document.querySelector("#results-section").classList.add("d-none");
        } else {
            document.querySelector("#results-section").classList.remove("d-none");
            setUiState(uiState);
        }
    },
    future: {
        preserveSharedStateOnUnmount: true,
    },
});
let debounceTimerId;
search.addWidgets([
    instantsearch.widgets.searchBox({
        container: '#searchbox',
        showSubmit: false,
        showReset: false,
        placeholder: "Type in a book title or author",
        autofocus: true,
        cssClasses: {
            input: "form-control searchbox-input",
        },
        queryHook(query, search) {
            const modifiedQuery = queryWithoutStopWords(query);
            if (modifiedQuery.trim() !== "" && modifiedQuery.trim().length > MIN_LENGTH) {
                if (debounceTimerId) {
                    clearTimeout(debounceTimerId);
                }
                debounceTimerId = setTimeout(() => search(modifiedQuery), DEBOUNCE_TIME) ;
            }
        },
    }),
    instantsearch.widgets.stats({
        container: "#stats",
        templates: {
            text: ({ nbHits, hasNoResults, hasOneResult, processingTimeMS }) => {
                let statsText = "";
                if (hasNoResults) {
                    statsText = "No results";
                } else if (hasOneResult) {
                    statsText = "1 result";
                } else {
                    statsText = `✨ ${nbHits.toLocaleString()} results`;
                }
                return `${statsText} found ${
                    indexSize ? ` - Searched ${indexSize.toLocaleString()} books` : ""
                } in ${processingTimeMS}ms.`;
            },
        },
    }),
    instantsearch.widgets.configure({
        hitsPerPage: 8,
    }),
    instantsearch.widgets.hits({
        container: '#hits',
        templates: {
            item(item) {
                return `
                        <div>
                          <img src="${item.image_url}" alt="${item.name}" height="100" />
                          <div class="hit-name">
                            ${item._highlightResult.title.value}
                          </div>
                          <div class="hit-authors">
                          ${item._highlightResult.authors.map((a) => a.value).join(', ')}
                          </div>
                          <div class="hit-publication-year">${item.publication_year}</div>
                          <div class="hit-rating">${item.average_rating}/5 rating</div>
                        </div>
                      `;
            },
        },
    }),
    instantsearch.widgets.pagination({
        container: '#pagination',
    }),
]);

search.start();