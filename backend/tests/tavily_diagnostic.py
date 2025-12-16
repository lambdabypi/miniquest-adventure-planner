#!/usr/bin/env python3
"""
COMPLETE Tavily Research Diagnostic - Shows Search, Extract, AND Snippet Fallback

Usage:
    python tavily_diagnostic.py "Museum of Fine Arts" "Boston, MA"
    python tavily_diagnostic.py "Tatte Bakery" "Boston, MA"
"""

import sys
import asyncio
import os
from tavily import TavilyClient
from datetime import datetime
import json
import re

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*80}{Colors.END}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text}{Colors.END}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*80}{Colors.END}\n")

def print_step(step_num, text):
    print(f"\n{Colors.CYAN}{Colors.BOLD}STEP {step_num}: {text}{Colors.END}")
    print(f"{Colors.CYAN}{'─'*80}{Colors.END}")

def print_info(label, value):
    print(f"{Colors.GREEN}{label}:{Colors.END} {value}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}❌ {text}{Colors.END}")

def print_success(text):
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")

def print_data(label, data, max_chars=500):
    """Print data with truncation"""
    print(f"\n{Colors.BLUE}{label}:{Colors.END}")
    if isinstance(data, str):
        truncated = data[:max_chars]
        if len(data) > max_chars:
            truncated += f"... [TRUNCATED: {len(data)} total chars]"
        print(f"  {truncated}")
    elif isinstance(data, (dict, list)):
        print(json.dumps(data, indent=2)[:max_chars])
    else:
        print(f"  {data}")

def extract_domain(url: str) -> str:
    """Extract and color-code domain from URL"""
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        domain = parsed.netloc.replace('www.', '')
        
        if '.org' in domain or '.edu' in domain or '.gov' in domain:
            return f"{Colors.GREEN}{domain} (OFFICIAL){Colors.END}"
        elif 'google' in domain:
            return f"{Colors.CYAN}{domain} (GOOGLE){Colors.END}"
        elif 'yelp' in domain:
            return f"{Colors.YELLOW}{domain} (REVIEW){Colors.END}"
        else:
            return domain
    except:
        return "unknown"

async def diagnostic_search_and_extract(venue_name: str, location: str):
    """Run complete diagnostic showing Search, Extract, and Snippet fallback"""
    
    # Initialize Tavily
    tavily_key = os.getenv("TAVILY_API_KEY")
    if not tavily_key:
        print_error("TAVILY_API_KEY not found in environment")
        print_info("Set it with", "export TAVILY_API_KEY='your_key_here'")
        return
    
    tavily_client = TavilyClient(api_key=tavily_key)
    
    print_header(f"TAVILY RESEARCH DIAGNOSTIC: {venue_name}")
    print_info("Venue", venue_name)
    print_info("Location", location)
    print_info("Timestamp", datetime.now().isoformat())
    print_info("Goal", "Find official site first, then diverse sources")
    
    # ==========================================
    # STEP 1: BUILD SEARCH QUERIES
    # ==========================================
    print_step(1, "BUILD SEARCH QUERIES")
    
    official_query = f'"{venue_name}" {location} official website'
    info_query = f'"{venue_name}" {location} hours information current'
    
    print_info("Official Site Query", official_query)
    print_info("Info Query", info_query)
    
    # ==========================================
    # STEP 2A: SEARCH FOR OFFICIAL SITE
    # ==========================================
    print_step("2A", "SEARCH FOR OFFICIAL SITE (Forced .org/.edu/.gov)")
    
    official_urls = []
    try:
        print_info("Purpose", "Find official website with domain filtering")
        print_info("Domain Filter", ".org, .edu, .gov, .museum")
        
        official_results = tavily_client.search(
            query=official_query,
            max_results=3,
            search_depth="basic",
            include_domains=[".org", ".edu", ".gov", ".museum"]  # ✅ Force official domains
        )
        
        results_official = official_results.get("results", [])
        print_success(f"Found {len(results_official)} official site results")
        
        for i, result in enumerate(results_official):
            url = result.get("url", "")
            is_official = any(ext in url.lower() for ext in ['.org', '.edu', '.gov', '.museum'])
            
            print(f"\n{Colors.BOLD}Official Result {i+1}:{Colors.END}")
            print_info("  URL", url)
            print_info("  Domain", extract_domain(url))
            print_info("  Is Official", f"{Colors.GREEN}✓ YES{Colors.END}" if is_official else f"{Colors.YELLOW}✗ NO{Colors.END}")
            
            if is_official and url not in official_urls:
                official_urls.append(url)
                print_success(f"  → Added to PRIORITY extract list")
        
        if official_urls:
            print_success(f"Found {len(official_urls)} official website(s)")
        else:
            print_warning("No official websites found - will rely on review sites")
        
    except Exception as e:
        print_error(f"Official site search failed: {e}")
    
    # ==========================================
    # STEP 2B: GENERAL SEARCH (No restrictions)
    # ==========================================
    print_step("2B", "GENERAL INFORMATION SEARCH (No Domain Restrictions)")
    
    snippets = []
    urls_to_extract = official_urls.copy()
    
    try:
        print_info("Parameters", "max_results=5, NO domain restrictions (let Tavily decide)")
        
        search_results = tavily_client.search(
            query=info_query,
            max_results=5,
            search_depth="basic"
            # ✅ NO include_domains - let Tavily find best sources
        )
        
        results = search_results.get("results", [])
        print_success(f"Found {len(results)} search results")
        
        for i, result in enumerate(results):
            url = result.get("url", "")
            snippet = result.get("content", "")
            
            print(f"\n{Colors.BOLD}Result {i+1}:{Colors.END}")
            print_info("  Title", result.get("title", "")[:100])
            print_info("  URL", url)
            print_info("  Domain", extract_domain(url))
            print_info("  Score", result.get("score", "N/A"))
            print_data("  Snippet", snippet, max_chars=200)
            
            # Analyze snippet for data
            if snippet:
                snippets.append(snippet)
                snippet_lower = snippet.lower()
                has_hours = any(term in snippet_lower for term in ['hours', 'open', 'am', 'pm', 'mon', 'tue', 'wed'])
                has_price = '$' in snippet or 'price' in snippet_lower or 'admission' in snippet_lower
                
                print_info("  Snippet Has Hours", f"{Colors.GREEN}✓{Colors.END}" if has_hours else f"{Colors.RED}✗{Colors.END}")
                print_info("  Snippet Has Prices", f"{Colors.GREEN}✓{Colors.END}" if has_price else f"{Colors.RED}✗{Colors.END}")
            
            if url and url not in urls_to_extract:
                urls_to_extract.append(url)
        
        if not urls_to_extract:
            print_warning("No URLs found to extract")
            
    except Exception as e:
        print_error(f"Search failed: {e}")
        return
    
    # ==========================================
    # STEP 3: EXECUTE TAVILY EXTRACT
    # ==========================================
    print_step(3, "EXECUTE TAVILY EXTRACT API")
    
    if urls_to_extract:
        print_info("URLs to Extract", f"{len(urls_to_extract)} URLs (official sites first)")
        for i, url in enumerate(urls_to_extract[:5]):
            domain_str = extract_domain(url)
            # Remove color codes for length check
            domain_clean = re.sub(r'\033\[[0-9;]+m', '', domain_str)
            print(f"  {i+1}. {domain_str} - {url[:60]}...")
    else:
        print_error("No URLs to extract!")
        return
    
    extracted_results = []
    try:
        print_info("API Call", "tavily_client.extract()")
        
        extract_result = tavily_client.extract(urls=urls_to_extract[:5])
        
        extracted_results = extract_result.get("results", [])
        
        if extracted_results:
            print_success(f"Extracted content from {len(extracted_results)} URLs")
            
            for i, extracted in enumerate(extracted_results):
                url = extracted.get("url", "")
                content = extracted.get("raw_content", "")
                
                print(f"\n{Colors.BOLD}Extracted Content {i+1}:{Colors.END}")
                print_info("  URL", url)
                print_info("  Domain", extract_domain(url))
                print_info("  Content Length", f"{len(content)} characters")
                
                if content:
                    print_data("  Content Preview", content, max_chars=500)
                    
                    # Analyze content
                    content_lower = content.lower()
                    print(f"\n{Colors.BOLD}  Content Analysis:{Colors.END}")
                    print_info("    Contains venue name", venue_name.lower() in content_lower)
                    print_info("    Contains 'hours'", "hours" in content_lower or "open" in content_lower)
                    print_info("    Contains prices", "$" in content or "price" in content_lower or "admission" in content_lower)
                    print_info("    Contains 'menu'", "menu" in content_lower)
                else:
                    print_warning("  Empty content extracted")
        else:
            print_error("Extract API returned 0 results!")
            print_warning("This means Tavily couldn't extract content from these URLs")
            print_info("Common reasons", "JavaScript-heavy pages (like Yelp), paywalls, or anti-scraping")
            print_info("Fallback Strategy", "Will use search snippets instead")
            
    except Exception as e:
        print_error(f"Extract API call failed: {e}")
    
    # ==========================================
    # STEP 4: ANALYZE AVAILABLE DATA
    # ==========================================
    print_step(4, "DATA AVAILABLE FOR SUMMARY AGENT")
    
    combined = ""
    data_source = ""
    
    # If extract succeeded
    if extracted_results:
        all_content = []
        for extracted in extracted_results:
            content = extracted.get("raw_content", "")
            if content:
                all_content.append(content[:1000])
        
        if all_content:
            combined = "\n\n".join(all_content)
            data_source = "EXTRACTED PAGES"
            print_success(f"Using {len(extracted_results)} extracted pages")
            print_info("Total Extract Content", f"{len(combined)} characters")
            print_data("Extract Preview", combined, max_chars=800)
    
    # If extract failed, fall back to snippets
    if not combined and snippets:
        combined = "\n\n".join(snippets)
        data_source = "SEARCH SNIPPETS (FALLBACK)"
        print_warning("Extract failed - using search snippets as fallback")
        print_info("Total Snippet Content", f"{len(combined)} characters")
        print_data("Combined Snippets", combined, max_chars=800)
    
    if not combined:
        print_error("NO DATA AVAILABLE - Neither extract nor snippets worked!")
        print_warning("Summary Agent will have NOTHING to work with")
        return
    
    print_success(f"Data Source: {data_source}")
    
    # ==========================================
    # STEP 5: DATA EXTRACTION ANALYSIS
    # ==========================================
    print_step(5, "WHAT SUMMARY AGENT SHOULD EXTRACT")
    
    combined_lower = combined.lower()
    
    # Hours detection (improved patterns)
    print(f"\n{Colors.BOLD}🕒 Hours Detection:{Colors.END}")
    hours_patterns = [
        r'mon\w*\s*[-:]\s*(?:closed|\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm))',
        r'tue\w*\s*[-:]\s*(?:closed|\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm))',
        r'wed\w*\s*[-:]\s*(?:closed|\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm))',
        r'thu\w*\s*[-:]\s*(?:closed|\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm))',
        r'fri\w*\s*[-:]\s*(?:closed|\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm))',
        r'sat\w*\s*[-:]\s*(?:closed|\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm))',
        r'sun\w*\s*[-:]\s*(?:closed|\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm))',
        r'hours?:?\s*\d',
        r'open\s+\d{1,2}:\d{2}',
        r'\d{1,2}:\d{2}\s*(?:am|pm)\s*-\s*\d{1,2}:\d{2}\s*(?:am|pm)'
    ]
    
    hours_found = []
    for pattern in hours_patterns:
        matches = re.findall(pattern, combined_lower)
        hours_found.extend(matches)
    
    if hours_found:
        print_success(f"Found {len(hours_found)} hour patterns")
        for i, match in enumerate(hours_found[:8]):
            print(f"  {i+1}. {match}")
        print(f"\n{Colors.GREEN}{Colors.BOLD}→ Summary Agent SHOULD extract: 'Mon-Fri 10am-5pm, Closed Tuesdays'{Colors.END}")
    else:
        print_warning("No clear hours data found in text")
        print_info("Summary Agent should", "Use 'Contact venue for hours'")
    
    # Price detection
    print(f"\n{Colors.BOLD}💰 Price Detection:{Colors.END}")
    price_patterns = [
        r'\$\d+(?:\.\d{2})?',
        r'\d+\s*dollars?',
        r'admission.*?\$\d+',
        r'ticket.*?\$\d+',
        r'free\s+(?:admission|entry)',
    ]
    
    prices_found = []
    for pattern in price_patterns:
        matches = re.findall(pattern, combined_lower)
        prices_found.extend(matches)
    
    if prices_found:
        print_success(f"Found {len(prices_found)} price patterns")
        for i, match in enumerate(prices_found[:8]):
            print(f"  {i+1}. {match}")
        print(f"\n{Colors.GREEN}{Colors.BOLD}→ Summary Agent SHOULD extract: '$27 adults, $25 seniors, Free under 17'{Colors.END}")
    else:
        print_warning("No clear price data found in text")
        print_info("Summary Agent should", "Use 'Contact venue for pricing'")
    
    # Menu/highlights detection
    print(f"\n{Colors.BOLD}⭐ Highlights Detection:{Colors.END}")
    highlights_keywords = ['menu', 'signature', 'collection', 'exhibit', 'famous', 'popular', 'specialty', 'known for']
    highlights_found = [kw for kw in highlights_keywords if kw in combined_lower]
    
    if highlights_found:
        print_success(f"Highlights keywords found: {highlights_found}")
        
        # Try to extract specific items near these keywords
        for keyword in highlights_found[:3]:
            context_pattern = rf'{keyword}\s+[^.!?]*?(?:\.|\n)'
            context_matches = re.findall(context_pattern, combined_lower)
            if context_matches:
                print(f"  Context for '{keyword}': {context_matches[0][:100]}...")
        
        print(f"\n{Colors.GREEN}{Colors.BOLD}→ Summary Agent SHOULD extract specific items/exhibits/dishes{Colors.END}")
    else:
        print_warning("No clear highlights keywords found")
    
    # ==========================================
    # STEP 6: DIAGNOSTIC SUMMARY
    # ==========================================
    print_header("DIAGNOSTIC SUMMARY")
    
    print(f"\n{Colors.BOLD}Pipeline Execution:{Colors.END}")
    print(f"  1. Official Site Search: {official_query}")
    print(f"     → Found {len(official_urls)} official URLs")
    print(f"  2. General Info Search: {info_query}")
    print(f"     → Found {len(results if 'results' in locals() else [])} total results")
    print(f"  3. Extract Attempt: {len(urls_to_extract)} URLs")
    print(f"     → Extracted {len(extracted_results)} pages successfully")
    print(f"  4. Fallback Data: {len(snippets)} snippets available")
    print(f"  5. Total Text: {len(combined)} characters for Summary Agent")
    
    print(f"\n{Colors.BOLD}URL Diversity:{Colors.END}")
    all_urls = urls_to_extract[:5]
    domains_found = {}
    for url in all_urls:
        domain_raw = extract_domain(url)
        # Extract just the domain name without color codes
        domain_clean = re.sub(r'\033\[[0-9;]+m', '', domain_raw)
        domain_type = domain_clean.split('(')[0].strip()
        domains_found[domain_type] = domains_found.get(domain_type, 0) + 1
    
    for domain, count in domains_found.items():
        print(f"  • {domain}: {count} URL(s)")
    
    if len(domains_found) == 1 and 'yelp' in str(domains_found).lower():
        print_warning("⚠️  Only Yelp found - missing official sites and Google!")
        print_info("Suggestion", "Add .org/.edu domains or improve search query")
    elif len(domains_found) >= 2:
        print_success(f"Good diversity: {len(domains_found)} different domain types")
    
    print(f"\n{Colors.BOLD}Data Quality Assessment:{Colors.END}")
    
    if hours_found:
        print_success("✓ Hours data: FOUND in text")
    else:
        print_error("✗ Hours data: MISSING from text")
    
    if prices_found:
        print_success("✓ Price data: FOUND in text")
    else:
        print_error("✗ Price data: MISSING from text")
    
    if highlights_found:
        print_success("✓ Highlights: FOUND in text")
    else:
        print_error("✗ Highlights: MISSING from text")
    
    print(f"\n{Colors.BOLD}What Should Happen Next:{Colors.END}")
    
    if extracted_results:
        print_success("Summary Agent receives: Full extracted page content")
        print_info("Expected quality", "HIGH - should extract specific hours, prices, items")
    elif snippets:
        print_warning("Summary Agent receives: Search snippets only")
        print_info("Expected quality", "MEDIUM - can extract basic info from snippets")
        print_info("Note", "Snippets often contain hours but not detailed descriptions")
    else:
        print_error("Summary Agent receives: NOTHING")
        print_warning("Will output: 'Check website' fallbacks")
    
    # Final recommendation
    print(f"\n{Colors.BOLD}Recommendation:{Colors.END}")
    
    if not extracted_results and snippets:
        print_warning("Extract failed but snippets available")
        print(f"{Colors.YELLOW}ACTION: Summary Agent MUST extract from snippets{Colors.END}")
        print(f"{Colors.YELLOW}The snippet data shown above SHOULD be used to extract:{Colors.END}")
        if hours_found:
            print(f"  • Hours: {hours_found[0] if hours_found else 'N/A'}")
        if prices_found:
            print(f"  • Prices: {prices_found[0] if prices_found else 'N/A'}")
    elif extracted_results:
        print_success("Extract succeeded - Summary Agent has full page content")
    else:
        print_error("No data available - research failed completely")

def main():
    if len(sys.argv) < 3:
        print(f"{Colors.HEADER}Tavily Research Diagnostic Tool{Colors.END}\n")
        print("Usage: python tavily_diagnostic.py <venue_name> <location>")
        print("\nExamples:")
        print('  python tavily_diagnostic.py "Museum of Fine Arts" "Boston, MA"')
        print('  python tavily_diagnostic.py "Tatte Bakery" "Boston, MA"')
        print('  python tavily_diagnostic.py "Isabella Stewart Gardner Museum" "Boston, MA"')
        print('  python tavily_diagnostic.py "Boston Common" "Boston, MA"')
        print("\nMake sure TAVILY_API_KEY is set in environment:")
        print('  export TAVILY_API_KEY="your_key_here"')
        sys.exit(1)
    
    venue_name = sys.argv[1]
    location = sys.argv[2]
    
    # Run diagnostic
    asyncio.run(diagnostic_search_and_extract(venue_name, location))

if __name__ == "__main__":
    main()