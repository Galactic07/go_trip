package service

import (
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

type UrlParseService struct {
	client *http.Client
}

func NewUrlParseService() *UrlParseService {
	return &UrlParseService{
		client: &http.Client{
			Timeout: 5 * time.Second,
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				if len(via) >= 3 {
					return http.ErrUseLastResponse
				}
				return nil
			},
		},
	}
}

type ParseResult struct {
	Title   string `json:"title"`
	Address string `json:"address"`
	Success bool   `json:"success"`
}

// 平台匹配规则
var platformPatterns = map[string]*regexp.Regexp{
	"xiaohongshu": regexp.MustCompile(`xiaohongshu\.com`),
	"douyin":      regexp.MustCompile(`douyin\.com`),
	"dianping":    regexp.MustCompile(`dianping\.com`),
	"amap":        regexp.MustCompile(`amap\.com`),
}

var ogTitleRe = regexp.MustCompile(`<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']`)
var ogDescRe  = regexp.MustCompile(`<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']`)
var titleRe    = regexp.MustCompile(`<title>([^<]+)</title>`)

func (s *UrlParseService) ParseURL(rawURL string) (*ParseResult, error) {
	rawURL = strings.TrimSpace(rawURL)

	// 高德地图链接：直接提取 keyword 参数
	if platformPatterns["amap"].MatchString(rawURL) {
		return s.parseAmapURL(rawURL)
	}

	req, err := http.NewRequest("GET", rawURL, nil)
	if err != nil {
		return &ParseResult{Success: false}, err
	}

	// 设置常见 User-Agent 避免被拒绝
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml")
	req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9")

	resp, err := s.client.Do(req)
	if err != nil {
		return &ParseResult{Success: false}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return &ParseResult{Success: false}, nil
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1024*256)) // 限制 256KB
	if err != nil {
		return &ParseResult{Success: false}, err
	}

	html := string(body)
	title := extractOGTitle(html)
	address := extractAddress(html)

	if title == "" {
		title = extractHTMLTitle(html)
	}

	if title == "" {
		return &ParseResult{Success: false}, nil
	}

	return &ParseResult{
		Title:   strings.TrimSpace(title),
		Address: strings.TrimSpace(address),
		Success: true,
	}, nil
}

func (s *UrlParseService) parseAmapURL(rawURL string) (*ParseResult, error) {
	re := regexp.MustCompile(`keyword=([^&]+)`)
	matches := re.FindStringSubmatch(rawURL)
	if len(matches) < 2 {
		return &ParseResult{Success: false}, nil
	}

	title, _ := decodeURIComponent(matches[1])
	if title == "" {
		return &ParseResult{Success: false}, nil
	}

	return &ParseResult{
		Title:   title,
		Address: "",
		Success: true,
	}, nil
}

func extractOGTitle(html string) string {
	matches := ogTitleRe.FindStringSubmatch(html)
	if len(matches) >= 2 {
		return matches[1]
	}
	return ""
}

func extractAddress(html string) string {
	desc := ogDescRe.FindStringSubmatch(html)
	if len(desc) >= 2 {
		text := desc[1]
		// 尝试从描述中提取地址信息（通常在描述后半部分）
		addrPatterns := []*regexp.Regexp{
			regexp.MustCompile(`(?:地址|位置|位于)[：:]\s*([^\n|，。]{5,50})`),
			regexp.MustCompile(`([^\n|]{4,30}(?:路|街|道|巷|广场|大厦|商场|公园|景区))`),
		}
		for _, re := range addrPatterns {
			m := re.FindStringSubmatch(text)
			if len(m) >= 2 {
				return m[1]
			}
		}
		// 如果描述较短，直接作为地址候选
		if len(text) > 5 && len(text) < 80 && !strings.Contains(text, "分享") {
			return text
		}
	}
	return ""
}

func extractHTMLTitle(html string) string {
	matches := titleRe.FindStringSubmatch(html)
	if len(matches) >= 2 {
		return matches[1]
	}
	return ""
}

func decodeURIComponent(s string) (string, error) {
	// 简单的 URL 解码，处理 %XX 格式
	re := regexp.MustCompile(`%([0-9A-Fa-f]{2})`)
	result := re.ReplaceAllStringFunc(s, func(hex string) string {
		b := hex[1:]
		n := 0
		for _, c := range b {
			n *= 16
			switch {
			case c >= '0' && c <= '9':
				n += int(c - '0')
			case c >= 'a' && c <= 'f':
				n += int(c - 'a' + 10)
			case c >= 'A' && c <= 'F':
				n += int(c - 'A' + 10)
			}
		}
		return string(rune(n))
	})
	return result, nil
}
