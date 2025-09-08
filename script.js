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

    async performSearch() {
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

        // Perform actual search if source manager is available
        if (this.sourceManager && this.sourceManager.initialized) {
            try {
                await this.performOSINTSearch(query, searchType);
            } catch (error) {
                console.error('Search failed:', error);
                this.showError('Search failed. Please try again.');
            }
        } else {
            // Fallback to placeholder
            setTimeout(() => {
                this.displayPlaceholderResults(query, searchType);
            }, 1500);
        }
    }

    async performOSINTSearch(query, searchType) {
        const availableSources = this.sourceManager.getSourcesForType(searchType);
        
        if (availableSources.length === 0) {
            this.showError(`No sources available for ${searchType} searches`);
            return;
        }

        // Initialize results
        this.currentResults = {
            query: query,
            searchType: searchType,
            timestamp: new Date().toISOString(),
            sources: [],
            summary: {
                totalSources: availableSources.length,
                successfulSources: 0,
                failedSources: 0,
                dataFound: false
            }
        };

        console.log(`Querying ${availableSources.length} sources for ${searchType}: ${query}`);

        // Query all sources concurrently
        const searchPromises = availableSources.map(source => 
            this.querySourceWithRetry(source.id, query, searchType)
        );

        // Wait for all searches to complete
        const results = await Promise.allSettled(searchPromises);
        
        // Process results
        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.success) {
                this.currentResults.sources.push(result.value);
                this.currentResults.summary.successfulSources++;
                if (result.value.data.found) {
                    this.currentResults.summary.dataFound = true;
                }
            } else {
                this.currentResults.summary.failedSources++;
                console.warn(`Source ${availableSources[index].name} failed:`, result.reason);
            }
        });

        // Display results
        this.displaySearchResults();
        this.updateTimelineResults();
        this.updateNetworkResults();
    }

    async querySourceWithRetry(sourceId, query, searchType, maxRetries = 2) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.sourceManager.querySource(sourceId, query, searchType);
            } catch (error) {
                console.warn(`Source ${sourceId} attempt ${attempt} failed:`, error);
                if (attempt === maxRetries) {
                    throw error;
                }
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
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

    displaySearchResults() {
        const resultsDiv = document.getElementById('searchResults');
        const results = this.currentResults;
        
        // Create summary section
        const summaryHtml = `
            <div class="search-summary">
                <h4>Search Results for: <span style="color: var(--accent-primary);">${results.query}</span></h4>
                <div class="summary-stats">
                    <span class="stat">Type: ${results.searchType.charAt(0).toUpperCase() + results.searchType.slice(1)}</span>
                    <span class="stat">Sources: ${results.summary.successfulSources}/${results.summary.totalSources}</span>
                    <span class="stat ${results.summary.dataFound ? 'data-found' : 'no-data'}">
                        ${results.summary.dataFound ? '✅ Data Found' : '❌ No Data'}
                    </span>
                </div>
                <hr style="margin: 15px 0; border-color: var(--border-color);">
            </div>
        `;

        // Create results from each source
        const resultsHtml = results.sources.map(sourceResult => {
            const confidence = sourceResult.confidence;
            const data = sourceResult.data;
            
            return `
                <div class="result-card ${data.found ? 'has-data' : 'no-data'}">
                    <div class="result-header">
                        <div class="source-info">
                            <span class="source-name">${sourceResult.sourceName}</span>
                            <span class="confidence-badge">${confidence}%</span>
                        </div>
                        <div class="result-status ${data.found ? 'found' : 'not-found'}">
                            ${data.found ? '✅ Found' : '❌ Not Found'}
                        </div>
                    </div>
                    
                    ${data.found ? this.renderSourceData(sourceResult) : `
                        <div class="no-data-message">
                            <p>No data found for this query</p>
                        </div>
                    `}
                    
                    <div class="result-footer">
                        <small>Queried: ${new Date(sourceResult.timestamp).toLocaleTimeString()}</small>
                    </div>
                </div>
            `;
        }).join('');

        resultsDiv.innerHTML = summaryHtml + '<div class="results-grid">' + resultsHtml + '</div>';
    }

    renderSourceData(sourceResult) {
        const data = sourceResult.data;
        const sourceType = this.sourceManager.findSourceById(sourceResult.sourceId)?.type;
        
        // Handle error cases
        if (data.error) {
            return `
                <div class="data-content">
                    <h5>⚠️ Error</h5>
                    <div class="error-message">
                        <p>${data.error}</p>
                    </div>
                </div>
            `;
        }
        
        switch (sourceType) {
            case 'breach_database':
                return `
                    <div class="data-content">
                        <h5>🚨 Breach Analysis Results</h5>
                        ${data.breaches ? `
                            <div class="breach-list">
                                ${data.breaches.map(breach => `
                                    <div class="breach-item">
                                        <span class="breach-name">${breach}</span>
                                    </div>
                                `).join('')}
                            </div>
                            <p><strong>Total Breaches:</strong> ${data.totalBreaches || 0}</p>
                            ${data.lastBreach ? `<p><strong>Most Recent:</strong> ${data.lastBreach}</p>` : ''}
                        ` : `
                            <p>${data.message || 'No breach patterns detected'}</p>
                        `}
                        <small><em>Method: ${data.analysisMethod || 'Pattern analysis'}</em></small>
                    </div>
                `;
                
            case 'email_structure':
                return `
                    <div class="data-content">
                        <h5>📧 Email Structure Analysis</h5>
                        ${data.structure ? `
                            <div class="email-info">
                                <p><strong>Username:</strong> ${data.structure.username}</p>
                                <p><strong>Domain:</strong> ${data.structure.domain}</p>
                                <p><strong>Username Length:</strong> ${data.structure.usernameLength}</p>
                            </div>
                        ` : ''}
                        ${data.patterns ? `
                            <div class="pattern-info">
                                <h6>Pattern Analysis:</h6>
                                <p>Has Numbers: ${data.patterns.hasNumbers ? 'Yes' : 'No'}</p>
                                <p>Has Special Characters: ${data.patterns.hasSpecialChars ? 'Yes' : 'No'}</p>
                                <p>Common Format: ${data.patterns.isCommonFormat ? 'Yes' : 'No'}</p>
                            </div>
                        ` : ''}
                        <small><em>Method: ${data.analysisMethod || 'Structure analysis'}</em></small>
                    </div>
                `;
                
            case 'pattern_analysis':
                return `
                    <div class="data-content">
                        <h5>🔍 Username Pattern Analysis</h5>
                        ${data.profiles ? `
                            <div class="profile-predictions">
                                <h6>Platform Predictions:</h6>
                                ${data.profiles.map(profile => `
                                    <div class="profile-item">
                                        <span class="platform">${profile.platform}</span>
                                        <span class="confidence">${profile.confidence ? Math.floor(profile.confidence * 100) : 'N/A'}%</span>
                                        <br><small>${profile.reasoning || 'Pattern-based prediction'}</small>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                        ${data.usernameCharacteristics ? `
                            <div class="characteristics">
                                <h6>Characteristics:</h6>
                                <p>Length: ${data.usernameCharacteristics.length}</p>
                                <p>Has Numbers: ${data.usernameCharacteristics.hasNumbers ? 'Yes' : 'No'}</p>
                                <p>Special Characters: ${data.usernameCharacteristics.hasSpecialChars ? 'Yes' : 'No'}</p>
                            </div>
                        ` : ''}
                        <small><em>Method: ${data.analysisMethod || 'Pattern recognition'}</em></small>
                    </div>
                `;
                
            case 'social_analysis':
                return `
                    <div class="data-content">
                        <h5>👥 Social Presence Analysis</h5>
                        ${data.profiles ? `
                            <div class="social-predictions">
                                <p><strong>Platforms Found:</strong> ${data.totalFound || 0}/${data.totalChecked || 0}</p>
                                ${data.profiles.map(profile => `
                                    <div class="social-item">
                                        <span class="platform">${profile.platform}</span>
                                        <span class="confidence">${profile.confidence}%</span>
                                        <span class="status">${profile.status}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <p>${data.message || 'No social presence patterns detected'}</p>
                        `}
                        <small><em>Method: ${data.analysisMethod || 'Social modeling'}</em></small>
                    </div>
                `;
                
            case 'structure_analysis':
                return `
                    <div class="data-content">
                        <h5>🌐 Domain Structure Analysis</h5>
                        ${data.structure ? `
                            <div class="domain-structure">
                                <p><strong>TLD:</strong> ${data.structure.tld} (${data.tldInfo?.type || 'unknown'})</p>
                                <p><strong>Is Subdomain:</strong> ${data.structure.isSubdomain ? 'Yes' : 'No'}</p>
                                <p><strong>Domain Depth:</strong> ${data.structure.depth} levels</p>
                                ${data.structure.subdomain ? `<p><strong>Subdomain Type:</strong> ${data.subdomainAnalysis?.type || 'custom'}</p>` : ''}
                            </div>
                        ` : ''}
                        <small><em>Method: ${data.analysisMethod || 'Structure analysis'}</em></small>
                    </div>
                `;
                
            case 'dns_analysis':
                return `
                    <div class="data-content">
                        <h5>🌐 DNS Pattern Analysis</h5>
                        ${data.records ? `
                            <div class="dns-records">
                                ${Object.entries(data.records).map(([type, records]) => `
                                    <p><strong>${type} Records:</strong> ${Array.isArray(records) ? records.join(', ') : records}</p>
                                `).join('')}
                            </div>
                        ` : ''}
                        <small><em>Method: ${data.analysisMethod || 'DNS simulation'}</em></small>
                    </div>
                `;
                
            case 'ip_analysis':
                return `
                    <div class="data-content">
                        <h5>🌍 IP Address Analysis</h5>
                        <div class="ip-info">
                            <p><strong>IP Class:</strong> ${data.ipClass || 'Unknown'}</p>
                            <p><strong>Type:</strong> ${data.isPrivate ? 'Private' : 'Public'} ${data.isReserved ? '(Reserved)' : ''}</p>
                            ${data.location ? `
                                <h6>Location Estimate:</h6>
                                <p><strong>Country:</strong> ${data.location.country}</p>
                                <p><strong>City:</strong> ${data.location.city}</p>
                                <p><strong>ISP:</strong> ${data.location.isp}</p>
                                <p><strong>Coordinates:</strong> ${data.location.coordinates.lat}, ${data.location.coordinates.lon}</p>
                            ` : ''}
                        </div>
                        <small><em>Method: ${data.analysisMethod || 'IP pattern analysis'}</em></small>
                    </div>
                `;
                
            case 'geolocation':
                return `
                    <div class="data-content">
                        <h5>📍 Geolocation Prediction</h5>
                        ${data.location ? `
                            <div class="location-info">
                                <p><strong>Country:</strong> ${data.location.country}</p>
                                <p><strong>City:</strong> ${data.location.city}</p>
                                <p><strong>ISP:</strong> ${data.location.isp}</p>
                                <p><strong>Coordinates:</strong> ${data.location.coordinates.lat}, ${data.location.coordinates.lon}</p>
                            </div>
                        ` : ''}
                        <small><em>Method: ${data.analysisMethod || 'Location prediction'}</em></small>
                    </div>
                `;
                
            default:
                return `
                    <div class="data-content">
                        <h5>📊 Analysis Results</h5>
                        <div class="generic-data">
                            <p>Analysis completed by ${sourceResult.sourceName}</p>
                            ${data.message ? `<p>${data.message}</p>` : ''}
                            ${data.analysisMethod ? `<p><strong>Method:</strong> ${data.analysisMethod}</p>` : ''}
                        </div>
                    </div>
                `;
        }
    }

    updateTimelineResults() {
        const timelineDiv = document.getElementById('timeline');
        
        if (!this.currentResults || this.currentResults.sources.length === 0) {
            this.updateTimelinePlaceholder();
            return;
        }

        // Create timeline data from search results
        const timelineEvents = [];
        
        this.currentResults.sources.forEach(sourceResult => {
            if (sourceResult.data.found) {
                const data = sourceResult.data;
                
                // Add events based on source type
                if (data.creationDate) {
                    timelineEvents.push({
                        date: data.creationDate,
                        event: `Domain registered`,
                        source: sourceResult.sourceName,
                        type: 'registration'
                    });
                }
                
                if (data.lastBreach) {
                    timelineEvents.push({
                        date: data.lastBreach,
                        event: `Last data breach`,
                        source: sourceResult.sourceName,
                        type: 'security'
                    });
                }
                
                if (data.profiles) {
                    data.profiles.forEach(profile => {
                        timelineEvents.push({
                            date: '2018-01-01', // Mock date
                            event: `${profile.platform} profile found`,
                            source: sourceResult.sourceName,
                            type: 'social'
                        });
                    });
                }
            }
        });

        // Sort by date
        timelineEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

        const timelineHtml = `
            <div class="timeline-header">
                <h3>📅 Timeline Analysis</h3>
                <p>${timelineEvents.length} events found for ${this.currentResults.query}</p>
            </div>
            <div class="timeline-events">
                ${timelineEvents.map((event, index) => `
                    <div class="timeline-event ${event.type}">
                        <div class="event-date">${new Date(event.date).toLocaleDateString()}</div>
                        <div class="event-content">
                            <div class="event-title">${event.event}</div>
                            <div class="event-source">Source: ${event.source}</div>
                        </div>
                    </div>
                `).join('')}
                ${timelineEvents.length === 0 ? '<p style="text-align: center; color: var(--text-secondary);">No timeline events found</p>' : ''}
            </div>
        `;

        timelineDiv.innerHTML = timelineHtml;
    }

    updateNetworkResults() {
        const networkDiv = document.getElementById('networkGraph');
        
        if (!this.currentResults || this.currentResults.sources.length === 0) {
            this.updateNetworkPlaceholder();
            return;
        }

        // Create network relationships from search results
        const relationships = [];
        const entities = new Set([this.currentResults.query]);
        
        this.currentResults.sources.forEach(sourceResult => {
            if (sourceResult.data.found) {
                const data = sourceResult.data;
                
                // Add related entities
                if (data.nameservers) {
                    data.nameservers.forEach(ns => {
                        entities.add(ns);
                        relationships.push({
                            from: this.currentResults.query,
                            to: ns,
                            type: 'nameserver',
                            source: sourceResult.sourceName
                        });
                    });
                }
                
                if (data.profiles) {
                    data.profiles.forEach(profile => {
                        const profileId = `${profile.platform}:${profile.username}`;
                        entities.add(profileId);
                        relationships.push({
                            from: this.currentResults.query,
                            to: profileId,
                            type: 'social_profile',
                            source: sourceResult.sourceName
                        });
                    });
                }
                
                if (data.isp) {
                    entities.add(data.isp);
                    relationships.push({
                        from: this.currentResults.query,
                        to: data.isp,
                        type: 'network',
                        source: sourceResult.sourceName
                    });
                }
            }
        });

        const networkHtml = `
            <div class="network-header">
                <h3>🕸️ Network Relationships</h3>
                <p>${entities.size} entities, ${relationships.length} relationships</p>
            </div>
            <div class="network-visualization">
                <div class="network-stats">
                    <div class="stat-item">
                        <span class="stat-label">Central Entity:</span>
                        <span class="stat-value">${this.currentResults.query}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Connected Entities:</span>
                        <span class="stat-value">${entities.size - 1}</span>
                    </div>
                </div>
                
                <div class="relationships-list">
                    ${relationships.map(rel => `
                        <div class="relationship-item ${rel.type}">
                            <div class="relationship-path">
                                <span class="entity from">${rel.from}</span>
                                <span class="arrow">→</span>
                                <span class="entity to">${rel.to}</span>
                            </div>
                            <div class="relationship-meta">
                                <span class="type">${rel.type.replace('_', ' ')}</span>
                                <span class="source">via ${rel.source}</span>
                            </div>
                        </div>
                    `).join('')}
                    ${relationships.length === 0 ? '<p style="text-align: center; color: var(--text-secondary);">No relationships found</p>' : ''}
                </div>
            </div>
        `;

        networkDiv.innerHTML = networkHtml;
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

    // Keep the old placeholder method for fallback
    displayPlaceholderResults(query, searchType) {
        const resultsDiv = document.getElementById('searchResults');
        
        resultsDiv.innerHTML = `
            <div class="search-summary">
                <h4>Search Results for: <span style="color: var(--accent-primary);">${query}</span></h4>
                <p>Type: ${searchType.charAt(0).toUpperCase() + searchType.slice(1)}</p>
                <hr style="margin: 15px 0; border-color: var(--border-color);">
            </div>
            
            <div class="placeholder-message">
                <p style="color: var(--text-secondary); text-align: center; padding: 20px;">
                    🚧 Source manager not available<br>
                    Please ensure all files are properly loaded
                </p>
            </div>
        `;

        this.updateTimelinePlaceholder();
        this.updateNetworkPlaceholder();
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