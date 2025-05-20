//https://www.algolia.com/doc/guides/building-search-ui/widgets/showcase/js/

const INDEX_NAME = 'books';
const STOP_WORDS = ['a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'if', 'in', 'into', 'is', 'it', 'no', 'not', 'of', 'on', 'or', 'such', 'that', 'the', 'their', 'then', 'there', 'these', 'they', 'this', 'to', 'was', 'will', 'with'];
const MIN_LENGTH = 1 ;
const HITS_PER_PAGE = 8 ;
const DEBOUNCE_TIME = 100 //ms


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


const typesenseInstantsearchAdapter = new TypesenseInstantSearchAdapter(    conf );

const searchClient = typesenseInstantsearchAdapter.searchClient;



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
        showReset: true,
        placeholder: "Type in a book title or author",
        autofocus: true,
        showLoadingIndicator:true,
        templates: {
            // reset({ cssClasses }, { html }) {
            //     return html`<span class="${cssClasses.reset}">reset</span>`;
            // },
        },
        cssClasses: {
            input: "form-control searchbox-input",
        },
        queryHook(query, search) {
            if (query.trim().length < 1){
                search() ;
                return ;
            }
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
                return `${statsText} found in ${processingTimeMS}ms.`;
            },
        },
    }),


    instantsearch.widgets.rangeInput({
        container: '#range-input',
        attribute: 'publication_year',
    }),
    instantsearch.widgets.rangeSlider({
        container: '#range-slider',
        attribute: 'publication_year',
    }),
    instantsearch.widgets.numericMenu({
        container: '#publication_year',
        attribute: 'publication_year',
        items: [
            { label: 'All' },
            { label: 'Before 1900', end: 1900 },
            { label: 'Between 500$ - 1000$', start: 500, end: 1000 },
            { label: 'More than 1000$', start: 1000 },
        ]
    }),
    instantsearch.widgets.ratingMenu({
        container: "#average_rating",
        attribute: 'average_rating',
    }),
    instantsearch.widgets.refinementList({
        container: "#author-refinement-list",
        attribute: "authors",
        searchable: true,
        searchablePlaceholder: "Search authors",
        showMore: true,
        showMoreLimit: 40,
        cssClasses: {
            searchableInput: "form-control form-control-sm mb-2 border-light-2",
            searchableSubmit: "d-none",
            searchableReset: "d-none",
            showMore: "btn btn-secondary btn-sm align-content-center",
            list: "list-unstyled",
            count: "badge bg-light text-bg-light ms-2",
            label: "d-flex align-items-center text-capitalize mb-2",
            checkbox: "me-2",
        },
    }),
    instantsearch.widgets.sortBy({
        container: "#sort-by",
        items: [
            { label: "Recent first", value: `${INDEX_NAME}` },
            { label: "Oldest first", value: `${INDEX_NAME}/sort/publication_year:asc` }, // publish_date
        ],
        cssClasses: {
            select: "form-select form-select-sm",
        },
    }),
    instantsearch.widgets.currentRefinements({
        container: "#current-refinements",
        cssClasses: {
            list: "list-unstyled",
            label: "d-none",
            item: "h5",
            category: "badge bg-light text-bg-light px-3 m-2",
            categoryLabel: "text-capitalize",
            delete: "btn btn-sm btn-link p-0 ps-2",
        },
        transformItems: (items) => {
            modifiedItems = items.map((item) => {
                return {
                    ...item,
                    label: "",
                };
            });
            return modifiedItems;
        },
    }),
    instantsearch.widgets.configure({
        hitsPerPage: HITS_PER_PAGE,
    }),
    instantsearch.widgets.hitsPerPage({
        container: '#hits-per-page',
        items: [
            { label: HITS_PER_PAGE + ' hits per page', value: HITS_PER_PAGE, default: true },
            { label: '16 hits per page', value: 16 },
        ],
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

    instantsearch.widgets.hits({
        container: '#hits',
        escapeHTML: false,
        cssClasses: {
            root: 'MyCustomHits',
            list: 'MyCustomHitsList',
        },
        templates: {
            root(li){
                console.log(li);
            },
            empty(results, { html }) {
                return html`No results for <q>${results.query}</q>`;
            },
            item(item, { html }) {
                return `<table>
                        <tr>
                        <td>
                          <img src="${item.image_url}" alt="${item.name}" height="50" />
                          </td>
                          <td class="hit-name">
                            ${item._highlightResult.title.value}
                            </td>
                          <td class="hit-authors">
                            ${item._highlightResult.authors.map((a) => a.value).join(', ')}
                          </td>
                          <td class="hit-publication-year">${item.publication_year}</td>
                          <td class="hit-rating">${item.average_rating}/5 rating</td>
                        </tr>
                        </table>
                      `;
            },
        },
    }),
    instantsearch.widgets.pagination({
        container: '#pagination',
    }),
]);


/*CUSTOM RENDER HITS */

// Create the render function
const renderHits = (renderOptions, isFirstRender) => {
    const { items, widgetParams } = renderOptions;

    widgetParams.container.innerHTML = `
    <!--<table>-->
      ${items
        .map(
            item =>
                `<tr>
                        <td>
                          <img src="${item.image_url}" alt="${item.name}" height="30" />
                          </td>
                          <td class="hit-name">
                            ${item._highlightResult.title.value}
                            </td>
                          <td class="hit-authors">
                            ${item._highlightResult.authors.map((a) => a.value).join(', ')}
                          </td>
                          <td class="hit-publication-year">${item.publication_year}</td>
                          <td class="hit-rating">${item.average_rating}/5 rating</td>
                        </tr>
                      `
        )
        .join('')}
    <!--</table>-->
  `;
};

// Create the custom widget
const customHits = instantsearch.connectors.connectHits(renderHits);

// Instantiate the custom widget
search.addWidgets([
    customHits({
        container: document.querySelector('#hits'),
    })
]);

/* CUSTOM SORT BY*/



// Create the render function
const renderSortBy = (renderOptions, isFirstRender) => {
    const {
        options,
        currentRefinement,
        refine,
        widgetParams,
        // `canRefine` is only available from v4.45.0
        // Use `hasNoResults` in earlier minor versions.
        canRefine,
    } = renderOptions;

    if (isFirstRender) {
        const select = document.createElement('select');

        select.addEventListener('change', event => {
            refine(event.target.value);
        });

        widgetParams.container.appendChild(select);
    }

    const select = widgetParams.container.querySelector('select');

    select.disabled = !canRefine;

    select.innerHTML = `
    ${options
        .map(
            option => `
          <option
            value="${option.value}"
            ${option.value === currentRefinement ? 'selected' : ''}
          >
            ${option.label}
          </option>
        `
        )
        .join('')}
  `;
};

// Create the custom widget
const customSortBy = instantsearch.connectors.connectSortBy(renderSortBy);

// Instantiate the custom widget
search.addWidgets([
    customSortBy({
        container: document.querySelector('#sort-by-2'),
        items: [
            { label: 'DEFAULT', value: `${INDEX_NAME}` },
            { label: 'publication_year (asc)', value: `${INDEX_NAME}/sort/publication_year:desc` },
            { label: 'publication_year (desc)', value: `${INDEX_NAME}/sort/publication_year:asc` },
            { label: 'average_rating (desc)', value: `${INDEX_NAME}/sort/average_rating:desc` },
            { label: 'average_rating (asc)', value: `${INDEX_NAME}/sort/average_rating:asc` },
            { label: 'title (desc)', value: `${INDEX_NAME}/sort/title:desc` },
            { label: 'title (asc)', value: `${INDEX_NAME}/sort/title:asc` },
        ],
    })
]);


/*
const analyticsMiddleware = () => {
    return {
        onStateChange() {
            // window.ga(
            //     "set",
            //     "page",
            //     (window.location.pathname + window.location.search).toLowerCase()
            // );
            // window.ga("send", "pageView");
        },
        subscribe() {},
        unsubscribe() {},
    };
};

search.use(analyticsMiddleware);

search.on("render", function () {
    Make author names clickable
    $("#hits .clickable-search-term").on("click", handleSearchTermClick);

    Read directions button
    $(".readDirectionsButton").on("click", (event) => {
        $(event.currentTarget).parent().siblings().first().modal("show");
    });
});

 */
search.start();