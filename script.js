// OSINT Data Aggregator - Main JavaScript
class OSINTAggregator {
    constructor() {
        this.currentQuery = '';
        this.currentResults = {};
        this.sourceManager = null;
        this.init();
    }

    async init() {
        this.bindEvents();
        this.setupTabs();
        
        // Initialize source manager
        try {
            this.sourceManager = new SourceManager();
            const initialized = await this.sourceManager.initialize();
            
            if (initialized) {
                this.displaySourceStats();
                console.log('OSINT Data Aggregator initialized with sources');
            } else {
                console.warn('OSINT Data Aggregator initialized without sources');
            }
        } catch (error) {
            console.error('Failed to initialize source manager:', error);
            console.log('OSINT Data Aggregator initialized without sources');
        }
    }

    bindEvents() {
        // Search functionality
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');

        searchBtn.addEventListener('click', () => this.performSearch());
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        // Auto-detect search type
        searchInput.addEventListener('input', () => {
            this.autoDetectSearchType();
        });
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // Remove active class from all buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });

        // Activate selected tab
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}Tab`).classList.remove('hidden');

        console.log(`Switched to ${tabName} tab`);
    }

    autoDetectSearchType() {
        const input = document.getElementById('searchInput').value.trim();
        const searchType = document.getElementById('searchType');

        if (!input) {
            searchType.value = 'auto';
            return;
        }

        // Email pattern
        if (input.includes('@') && input.includes('.')) {
            searchType.value = 'email';
        }
        // IP address pattern
        else if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(input)) {
            searchType.value = 'ip';
        }
        // Domain pattern
        else if (input.includes('.') && !input.includes('@')) {
            searchType.value = 'domain';
        }
        // Default to username
        else {
            searchType.value = 'username';
        }
    }

    performSearch() {
        const query = document.getElementById('searchInput').value.trim();
        const searchType = document.getElementById('searchType').value;

        if (!query) {
            this.showError('Please enter a search query');
            return;
        }

        this.currentQuery = query;
        
        console.log(`Searching for: ${query} (type: ${searchType})`);
        
        // Show results section
        document.getElementById('resultsSection').style.display = 'block';
        
        // Show loading state
        this.showLoading();

        // Simulate search delay
        setTimeout(() => {
            this.displayPlaceholderResults(query, searchType);
        }, 1500);
    }

    showLoading() {
        const resultsDiv = document.getElementById('searchResults');
        resultsDiv.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="loading"></div>
                <p style="margin-top: 15px; color: var(--text-secondary);">
                    Searching across OSINT sources...
                </p>
            </div>
        `;
    }

    displayPlaceholderResults(query, searchType) {
        const resultsDiv = document.getElementById('searchResults');
        
        // Get available sources for this search type (if source manager is loaded)
        let sourcesHtml = '';
        let sourceCount = 0;
        
        if (this.sourceManager && this.sourceManager.initialized) {
            const availableSources = this.sourceManager.getSourcesForType(searchType);
            sourceCount = availableSources.length;
            
            if (availableSources.length > 0) {
                sourcesHtml = `
                    <div class="sources-section">
                        <h4>📡 Available Sources for ${searchType.charAt(0).toUpperCase() + searchType.slice(1)}</h4>
                        <div class="sources-grid">
                            ${availableSources.map(source => `
                                <div class="source-card">
                                    <div class="source-header">
                                        <span class="source-name">${source.name}</span>
                                        <span class="confidence-badge">${source.confidence}%</span>
                                    </div>
                                    <div class="source-description">${source.description}</div>
                                    <div class="source-types">
                                        ${source.dataTypes.slice(0, 3).map(type => 
                                            `<span class="data-type">${type}</span>`
                                        ).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
        }
        
        resultsDiv.innerHTML = `
            <div class="search-summary">
                <h4>Search Results for: <span style="color: var(--accent-primary);">${query}</span></h4>
                <p>Type: ${searchType.charAt(0).toUpperCase() + searchType.slice(1)} | Sources: ${sourceCount}</p>
                <hr style="margin: 15px 0; border-color: var(--border-color);">
            </div>
            
            ${sourcesHtml}
            
            <div class="placeholder-message">
                <p style="color: var(--text-secondary); text-align: center; padding: 20px;">
                    ${sourceCount > 0 ? 
                        `🚧 Data aggregation will be implemented in the next commit<br>Source framework is now ready with ${sourceCount} configured sources` :
                        `🚧 OSINT data sources will be implemented in upcoming commits<br>This is the foundation structure for the aggregator`
                    }
                </p>
            </div>
        `;

        // Update timeline and network tabs with placeholders
        this.updateTimelinePlaceholder();
        this.updateNetworkPlaceholder();
    }

    displaySourceStats() {
        // Add source statistics to the footer or header
        if (this.sourceManager && this.sourceManager.initialized) {
            const stats = this.sourceManager.getSourceStats();
            console.log('OSINT Sources loaded:', stats);
            
            // Update the header subtitle with source count
            const headerP = document.querySelector('.header p');
            if (headerP) {
                headerP.textContent = `Gather and visualize intelligence from ${stats.totalSources} public sources`;
            }
        }
    }

    updateTimelinePlaceholder() {
        const timelineDiv = document.getElementById('timeline');
        timelineDiv.innerHTML = `
            <div style="text-align: center; color: var(--text-secondary);">
                <h3>📅 Timeline View</h3>
                <p>Timeline visualization will be implemented in upcoming commits</p>
            </div>
        `;
    }

    updateNetworkPlaceholder() {
        const networkDiv = document.getElementById('networkGraph');
        networkDiv.innerHTML = `
            <div style="text-align: center; color: var(--text-secondary);">
                <h3>🕸️ Network Graph</h3>
                <p>Relationship mapping will be implemented in upcoming commits</p>
            </div>
        `;
    }

    showError(message) {
        const resultsDiv = document.getElementById('searchResults');
        resultsDiv.innerHTML = `
            <div style="color: #ff4444; text-align: center; padding: 20px;">
                ⚠️ ${message}
            </div>
        `;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Load source manager script
    const script = document.createElement('script');
    script.src = './components/source-manager.js';
    script.onload = () => {
        // SourceManager is now available
        new OSINTAggregator();
    };
    script.onerror = () => {
        console.error('Failed to load source-manager.js');
        // Initialize without sources
        new OSINTAggregator();
    };
    document.head.appendChild(script);
});