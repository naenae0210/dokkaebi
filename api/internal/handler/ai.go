package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"hangwith/api/internal/repository"
)

const geminiAPIURL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

type AIHandler struct {
	categoryRepo  repository.CategoryRepository
	placeTypeRepo repository.PlaceTypeRepository
	apiKey        string
	apiURL        string
	client        *http.Client
}

func NewAIHandler(categoryRepo repository.CategoryRepository, placeTypeRepo repository.PlaceTypeRepository) *AIHandler {
	return &AIHandler{
		categoryRepo:  categoryRepo,
		placeTypeRepo: placeTypeRepo,
		apiKey:        os.Getenv("GEMINI_API_KEY"),
		apiURL:        geminiAPIURL,
		client:        &http.Client{Timeout: 20 * time.Second},
	}
}

type aiPlaceSuggestion struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

type aiPlanSuggestion struct {
	City     string              `json:"city"`
	Category string              `json:"category"`
	Title    string              `json:"title"`
	Places   []aiPlaceSuggestion `json:"places"`
}

// GeneratePlan turns a one-line natural language request (e.g. "도쿄 여행일정 짜줘")
// into a draft city/category/title/places suggestion. Nothing is persisted here —
// the frontend pre-fills the existing card form so the user can review and edit
// before actually saving.
func (h *AIHandler) GeneratePlan(c echo.Context) error {
	var req struct {
		Prompt string `json:"prompt"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}
	req.Prompt = strings.TrimSpace(req.Prompt)
	if req.Prompt == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "prompt is required")
	}
	if len(req.Prompt) > 300 {
		return echo.NewHTTPError(http.StatusBadRequest, "prompt too long")
	}

	ctx := c.Request().Context()
	categories, err := h.categoryRepo.List(ctx)
	if err != nil {
		c.Logger().Error(err)
		return echo.NewHTTPError(http.StatusInternalServerError, "internal server error")
	}
	placeTypes, err := h.placeTypeRepo.List(ctx)
	if err != nil {
		c.Logger().Error(err)
		return echo.NewHTTPError(http.StatusInternalServerError, "internal server error")
	}
	if len(categories) == 0 || len(placeTypes) == 0 {
		return echo.NewHTTPError(http.StatusInternalServerError, "no categories or place types configured")
	}

	categoryIDs := make([]string, len(categories))
	for i, cat := range categories {
		categoryIDs[i] = cat.ID
	}
	placeTypeIDs := make([]string, len(placeTypes))
	placeTypeDesc := make([]string, len(placeTypes))
	for i, pt := range placeTypes {
		placeTypeIDs[i] = pt.ID
		placeTypeDesc[i] = fmt.Sprintf("%s(%s)", pt.ID, pt.Label)
	}

	suggestion, err := h.callGemini(ctx, req.Prompt, categoryIDs, placeTypeIDs, placeTypeDesc)
	if err != nil {
		c.Logger().Error(err)
		return echo.NewHTTPError(http.StatusBadGateway, "failed to generate plan")
	}

	sanitizeSuggestion(suggestion, categoryIDs, placeTypeIDs)
	if suggestion.City == "" || suggestion.Title == "" || len(suggestion.Places) == 0 {
		return echo.NewHTTPError(http.StatusBadGateway, "AI returned an incomplete plan")
	}

	return c.JSON(http.StatusOK, suggestion)
}

func (h *AIHandler) callGemini(ctx context.Context, prompt string, categoryIDs, placeTypeIDs, placeTypeDesc []string) (*aiPlanSuggestion, error) {
	systemPrompt := fmt.Sprintf(
		"당신은 여행 일정 추천 도우미입니다. 사용자의 한 줄 요청을 읽고 방문 도시 하나와, 하루 동안 실제로 소화 가능한 추천 장소 목록을 만드세요.\n"+
			"장소는 4~6개만 추천하세요.\n"+
			"가장 중요한 규칙: 도시 전체에 흩어진 유명한 곳을 나열하지 말고, 도보나 짧은 대중교통으로 충분히 이동 가능한 "+
			"하나의 동네/지역에 모여 있는 장소만 골라서, 한 지역 안에서 자연스러운 하루 동선이 되도록 구성하세요.\n"+
			"places 배열은 실제로 방문하면 좋을 순서대로(예: 오전 장소 → 점심 → 오후 장소 → 저녁/카페) 정렬하세요.\n"+
			"category는 반드시 다음 중 하나를 선택하세요: %s\n"+
			"장소의 type은 반드시 다음 중 하나를 선택하세요: %s. 바(bar)나 펍처럼 술을 마시는 곳은 Cafe로 분류하고, "+
			"관광지·백화점·쇼핑몰·기타 명소는 Activity로 분류하세요.\n"+
			"places 배열에는 Cafe류, Restaurant류, Activity류 장소를 골고루 섞어서 포함하세요.\n"+
			"city와 title은 한국어로 간결하게 작성하세요.",
		strings.Join(categoryIDs, ", "),
		strings.Join(placeTypeDesc, ", "),
	)

	schema := map[string]any{
		"type": "OBJECT",
		"properties": map[string]any{
			"city":     map[string]any{"type": "STRING"},
			"category": map[string]any{"type": "STRING", "enum": categoryIDs},
			"title":    map[string]any{"type": "STRING"},
			"places": map[string]any{
				"type": "ARRAY",
				"items": map[string]any{
					"type": "OBJECT",
					"properties": map[string]any{
						"name": map[string]any{"type": "STRING"},
						"type": map[string]any{"type": "STRING", "enum": placeTypeIDs},
					},
					"required": []string{"name", "type"},
				},
			},
		},
		"required": []string{"city", "category", "title", "places"},
	}

	body := map[string]any{
		"contents": []map[string]any{
			{"parts": []map[string]any{{"text": prompt}}},
		},
		"systemInstruction": map[string]any{
			"parts": []map[string]any{{"text": systemPrompt}},
		},
		"generationConfig": map[string]any{
			"responseMimeType": "application/json",
			"responseSchema":   schema,
		},
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, h.apiURL, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-goog-api-key", h.apiKey)

	resp, err := h.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("gemini request failed: %s: %s", resp.Status, string(b))
	}

	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return nil, err
	}
	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("empty gemini response")
	}

	var suggestion aiPlanSuggestion
	if err := json.Unmarshal([]byte(geminiResp.Candidates[0].Content.Parts[0].Text), &suggestion); err != nil {
		return nil, fmt.Errorf("invalid gemini json: %w", err)
	}

	return &suggestion, nil
}


func sanitizeSuggestion(s *aiPlanSuggestion, categoryIDs, placeTypeIDs []string) {
	s.City = strings.TrimSpace(s.City)
	s.Title = strings.TrimSpace(s.Title)

	if !contains(categoryIDs, s.Category) && len(categoryIDs) > 0 {
		s.Category = categoryIDs[0]
	}

	cleaned := make([]aiPlaceSuggestion, 0, len(s.Places))
	for _, p := range s.Places {
		name := strings.TrimSpace(p.Name)
		if name == "" {
			continue
		}
		if !contains(placeTypeIDs, p.Type) && len(placeTypeIDs) > 0 {
			p.Type = placeTypeIDs[0]
		}
		cleaned = append(cleaned, aiPlaceSuggestion{Name: name, Type: p.Type})
		if len(cleaned) == 12 {
			break
		}
	}
	s.Places = cleaned
}

func contains(list []string, v string) bool {
	for _, item := range list {
		if item == v {
			return true
		}
	}
	return false
}
