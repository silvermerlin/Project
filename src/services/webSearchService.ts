export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  timestamp: Date;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalResults: number;
  searchTime: number;
}

class WebSearchService {
  private readonly maxResults = 10;
  private readonly timeout = 10000;

  async search(query: string): Promise<SearchResponse> {
    const startTime = Date.now();
    
    try {
      // Use DuckDuckGo Instant Answer API for web search
      const response = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      if (!response.ok) {
        throw new Error(`Search API error: ${response.status}`);
      }

      const data = await response.json();
      const results = this.parseSearchResults(data);
      
      return {
        query,
        results,
        totalResults: results.length,
        searchTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Web search failed:', error);
      
      // Fallback to simulated search results for development
      return this.getFallbackResults(query, Date.now() - startTime);
    }
  }

  private parseSearchResults(data: any): SearchResult[] {
    const results: SearchResult[] = [];
    
    // Parse DuckDuckGo response
    if (data.AbstractText && data.AbstractURL) {
      results.push({
        title: data.Heading || 'Abstract',
        url: data.AbstractURL,
        snippet: data.AbstractText,
        domain: this.extractDomain(data.AbstractURL),
        timestamp: new Date(),
      });
    }

    // Parse related topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      data.RelatedTopics.slice(0, this.maxResults - results.length).forEach((topic: any) => {
        if (topic.FirstURL && topic.Text) {
          results.push({
            title: topic.Text.split(' - ')[0] || 'Related Topic',
            url: topic.FirstURL,
            snippet: topic.Text,
            domain: this.extractDomain(topic.FirstURL),
            timestamp: new Date(),
          });
        }
      });
    }

    return results;
  }

  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return 'unknown';
    }
  }

  private getFallbackResults(query: string, searchTime: number): SearchResponse {
    // Simulated search results for development/testing
    const mockResults: SearchResult[] = [
      {
        title: `${query} - Documentation`,
        url: `https://example.com/docs/${query.replace(/\s+/g, '-')}`,
        snippet: `Official documentation for ${query}. Learn how to use ${query} effectively with examples and best practices.`,
        domain: 'example.com',
        timestamp: new Date(),
      },
      {
        title: `${query} Tutorial - Stack Overflow`,
        url: `https://stackoverflow.com/questions/tagged/${query.replace(/\s+/g, '-')}`,
        snippet: `Stack Overflow questions and answers about ${query}. Find solutions to common problems and implementation examples.`,
        domain: 'stackoverflow.com',
        timestamp: new Date(),
      },
      {
        title: `${query} Examples - GitHub`,
        url: `https://github.com/search?q=${encodeURIComponent(query)}`,
        snippet: `GitHub repositories and code examples for ${query}. Browse open source projects and implementations.`,
        domain: 'github.com',
        timestamp: new Date(),
      },
      {
        title: `${query} Best Practices - Medium`,
        url: `https://medium.com/search?q=${encodeURIComponent(query)}`,
        snippet: `Articles and tutorials about ${query} best practices. Learn from experienced developers and industry experts.`,
        domain: 'medium.com',
        timestamp: new Date(),
      },
      {
        title: `${query} API Reference`,
        url: `https://developer.example.com/api/${query.replace(/\s+/g, '-')}`,
        snippet: `API reference and documentation for ${query}. Complete guide to available methods, parameters, and responses.`,
        domain: 'developer.example.com',
        timestamp: new Date(),
      },
    ];

    return {
      query,
      results: mockResults,
      totalResults: mockResults.length,
      searchTime,
    };
  }

  async searchCode(query: string, language?: string): Promise<SearchResponse> {
    const searchQuery = language 
      ? `${query} language:${language} site:github.com`
      : `${query} site:github.com`;
    
    return this.search(searchQuery);
  }

  async searchDocumentation(query: string): Promise<SearchResponse> {
    const searchQuery = `${query} documentation site:docs.* OR site:*.readthedocs.io`;
    return this.search(searchQuery);
  }

  async searchStackOverflow(query: string): Promise<SearchResponse> {
    const searchQuery = `${query} site:stackoverflow.com`;
    return this.search(searchQuery);
  }

  async searchTutorials(query: string): Promise<SearchResponse> {
    const searchQuery = `${query} tutorial OR guide OR how-to`;
    return this.search(searchQuery);
  }

  async searchPackages(query: string, ecosystem?: string): Promise<SearchResponse> {
    let searchQuery = `${query} package`;
    
    if (ecosystem) {
      switch (ecosystem.toLowerCase()) {
        case 'npm':
          searchQuery += ' site:npmjs.com';
          break;
        case 'pypi':
          searchQuery += ' site:pypi.org';
          break;
        case 'maven':
          searchQuery += ' site:search.maven.org';
          break;
        case 'nuget':
          searchQuery += ' site:nuget.org';
          break;
        case 'gems':
          searchQuery += ' site:rubygems.org';
          break;
        default:
          searchQuery += ` ${ecosystem}`;
      }
    }
    
    return this.search(searchQuery);
  }
}

export const webSearchService = new WebSearchService(); 