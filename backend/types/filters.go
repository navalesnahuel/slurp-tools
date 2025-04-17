package types

import (
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/draw"

	"github.com/disintegration/gift"
)

type Filter interface {
	ToGift() gift.Filter
}

type Validater interface {
	Validate() error
}

func ApplyFilters(src image.Image, filters ...gift.Filter) image.Image {
	g := gift.New(filters...)
	dst := image.NewRGBA(g.Bounds(src.Bounds()))
	g.Draw(dst, src)
	return dst
}

func CreateFilter(fr FilterRequest) (Filter, error) {
	var f Filter
	var err error

	switch fr.Filter {
	case "resize":
		var v Resize
		err = json.Unmarshal(fr.Params, &v)
		f = v
	case "crop":
		var v Crop
		err = json.Unmarshal(fr.Params, &v)
		f = v
	case "rotate":
		var v Rotate
		err = json.Unmarshal(fr.Params, &v)
		f = v
	case "brightness":
		var v Brightness
		err = json.Unmarshal(fr.Params, &v)
		f = v
	case "contrast":
		var v Contrast
		err = json.Unmarshal(fr.Params, &v)
		f = v
	case "saturation":
		var v Saturation
		err = json.Unmarshal(fr.Params, &v)
		f = v
	case "gamma":
		var v Gamma
		err = json.Unmarshal(fr.Params, &v)
		f = v
	case "gaussianblur":
		var v GaussianBlur
		err = json.Unmarshal(fr.Params, &v)
		f = v
	case "unsharpmask":
		var v UnsharpMask
		err = json.Unmarshal(fr.Params, &v)
		f = v
	case "sigmoid":
		var v Sigmoid
		err = json.Unmarshal(fr.Params, &v)
		f = v
	case "pixelate":
		var v Pixelate
		err = json.Unmarshal(fr.Params, &v)
		f = v
	case "colorize":
		var v Colorize
		err = json.Unmarshal(fr.Params, &v)
		f = v
	case "sepia":
		var v Sepia
		err = json.Unmarshal(fr.Params, &v)
		f = v
	case "mean":
		var v Mean
		err = json.Unmarshal(fr.Params, &v)
		f = v
	case "median":
		var v Median
		err = json.Unmarshal(fr.Params, &v)
		f = v
	case "minimum":
		var v Minimum
		err = json.Unmarshal(fr.Params, &v)
		f = v
	case "maximum":
		var v Maximum
		err = json.Unmarshal(fr.Params, &v)
		f = v
	case "hue":
		var v Hue
		err = json.Unmarshal(fr.Params, &v)
		f = v
	case "colorbalance":
		var v ColorBalance
		err = json.Unmarshal(fr.Params, &v)
		f = v
	case "grayscale":
		f = Grayscale{}
	case "invert":
		f = Invert{}
	case "rotate180":
		f = Rotate180{}
	case "scanify":
		f = NewScanifyFilter()
	default:
		return nil, fmt.Errorf("unknown filter: %s", fr.Filter)
	}

	if err != nil {
		return nil, err
	}

	if v, ok := f.(Validater); ok {
		if err := v.Validate(); err != nil {
			return nil, fmt.Errorf("invalid filter %s: %w", fr.Filter, err)
		}
	}

	return f, nil
}

func (f *ScanifyFilter) Draw(dst draw.Image, src image.Image, options *gift.Options) {
	bounds := src.Bounds()
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			gray := color.GrayModel.Convert(src.At(x, y)).(color.Gray)
			var out color.Gray

			if gray.Y > 200 {
				out = color.Gray{255}
			} else if gray.Y < 80 {
				out = color.Gray{0}
			} else {
				out = gray
			}

			dst.Set(x, y, out)
		}
	}
}

func (f *ScanifyFilter) Bounds(srcBounds image.Rectangle) image.Rectangle {
	return srcBounds
}

func NewScanifyFilter() *ScanifyFilter {
	return &ScanifyFilter{}
}

type FilterRequest struct {
	Filter string          `json:"filter"`
	Params json.RawMessage `json:"params"`
}

func (f *ScanifyFilter) ToGift() gift.Filter {
	return f
}

func (f Resize) ToGift() gift.Filter {
	return gift.Resize(f.Width, f.Height, gift.LanczosResampling)
}

// Crop filter
func (f Crop) ToGift() gift.Filter {
	return gift.Crop(image.Rect(f.X, f.Y, f.Width+f.X, f.Height+f.Y))
}

// Rotate filter
func (f Rotate) ToGift() gift.Filter {
	var interp gift.Interpolation
	switch f.Interpolation {
	case "nearest":
		interp = gift.NearestNeighborInterpolation
	case "linear":
		interp = gift.LinearInterpolation
	case "cubic":
		interp = gift.CubicInterpolation
	default:
		interp = gift.CubicInterpolation
	}

	return gift.Rotate(float32(f.Angle), color.Transparent, interp)
}

// Brightness filter
func (f Brightness) ToGift() gift.Filter {
	return gift.Brightness(f.Percentage)
}

// Contrast filter
func (f Contrast) ToGift() gift.Filter {
	return gift.Contrast(f.Percentage)
}

// Saturation filter
func (f Saturation) ToGift() gift.Filter {
	return gift.Saturation(f.Percentage)
}

// Gamma filter
func (f Gamma) ToGift() gift.Filter {
	return gift.Gamma(f.Gamma)
}

// GaussianBlur filter
func (f GaussianBlur) ToGift() gift.Filter {
	return gift.GaussianBlur(f.Sigma)
}

// UnsharpMask filter
func (f UnsharpMask) ToGift() gift.Filter {
	return gift.UnsharpMask(f.Sigma, f.Amount, f.Threshold)
}

// Sigmoid filter
func (f Sigmoid) ToGift() gift.Filter {
	return gift.Sigmoid(f.Contrast, f.Midpoint)
}

// Pixelate filter
func (f Pixelate) ToGift() gift.Filter {
	return gift.Pixelate(f.Size)
}

// Colorize filter
func (f Colorize) ToGift() gift.Filter {
	return gift.Colorize(f.Hue, f.Saturation, f.Value)
}

// Sepia filter
func (f Sepia) ToGift() gift.Filter {
	return gift.Sepia(f.Percentage)
}

// Mean filter
func (f Mean) ToGift() gift.Filter {
	return gift.Mean(f.Radius, f.Alpha)
}

// Median filter
func (f Median) ToGift() gift.Filter {
	return gift.Median(f.Radius, f.Alpha)
}

// Minimum filter
func (f Minimum) ToGift() gift.Filter {
	return gift.Minimum(f.Radius, f.Alpha)
}

// Maximum filter
func (f Maximum) ToGift() gift.Filter {
	return gift.Maximum(f.Radius, f.Alpha)
}

// Hue filter
func (f Hue) ToGift() gift.Filter {
	return gift.Hue(f.Angle)
}

// ColorBalance filter
func (f ColorBalance) ToGift() gift.Filter {
	return gift.ColorBalance(f.Red, f.Green, f.Blue)
}

// Grayscale filter
func (f Grayscale) ToGift() gift.Filter {
	return gift.Grayscale()
}

// Invert filter
func (f Invert) ToGift() gift.Filter {
	return gift.Invert()
}

// Rotate180 filter
func (f Rotate180) ToGift() gift.Filter {
	return gift.Rotate180()
}

type Resize struct {
	Width  int `json:"width"`
	Height int `json:"height"`
}

type Crop struct {
	Width  int `json:"width"`
	Height int `json:"height"`
	X      int `json:"x"`
	Y      int `json:"y"`
}

type Rotate struct {
	Angle         float32 `json:"angle"`
	Interpolation string  `json:"interpolation"` // e.g. "nearest", "linear", "cubic"
}

type Brightness struct {
	Percentage float32 `json:"percentage"` // -100 to 100
}

type Contrast struct {
	Percentage float32 `json:"percentage"` // -100 to 100
}

type Saturation struct {
	Percentage float32 `json:"percentage"` // -100 to 100
}

type Gamma struct {
	Gamma float32 `json:"gamma"`
}

type GaussianBlur struct {
	Sigma float32 `json:"sigma"`
}

type UnsharpMask struct {
	Sigma     float32 `json:"sigma"`
	Amount    float32 `json:"amount"`
	Threshold float32 `json:"threshold"`
}

type Sigmoid struct {
	Contrast float32 `json:"contrast"`
	Midpoint float32 `json:"midpoint"`
}

type Pixelate struct {
	Size int `json:"size"`
}

type Colorize struct {
	Hue        float32 `json:"hue"`
	Saturation float32 `json:"saturation"`
	Value      float32 `json:"value"`
}

type Sepia struct {
	Percentage float32 `json:"percentage"` // 0 to 100
}

type Mean struct {
	Radius int  `json:"radius"`
	Alpha  bool `json:"alpha"`
}

type Median struct {
	Radius int  `json:"radius"`
	Alpha  bool `json:"alpha"`
}

type Minimum struct {
	Radius int  `json:"radius"`
	Alpha  bool `json:"alpha"`
}

type Maximum struct {
	Radius int  `json:"radius"`
	Alpha  bool `json:"alpha"`
}

type Hue struct {
	Angle float32 `json:"angle"` // in degrees
}

type ColorBalance struct {
	Red   float32 `json:"red"`
	Green float32 `json:"green"`
	Blue  float32 `json:"blue"`
}

// Filters without parameters
type (
	Grayscale     struct{}
	Invert        struct{}
	Rotate180     struct{}
	ScanifyFilter struct{}
)

// Validate method
func (f Resize) Validate() error {
	if f.Width <= 0 || f.Height <= 0 {
		return fmt.Errorf("resize: width and height must be greater than zero")
	}
	return nil
}

func (f Crop) Validate() error {
	if f.Width < 0 || f.Height < 0 || f.X < 0 || f.Y < 0 {
		return fmt.Errorf("crop: values must be greater than zero")
	}
	return nil
}

func (f Rotate) Validate() error {
	valid := map[string]bool{"nearest": true, "linear": true, "cubic": true}
	if _, ok := valid[f.Interpolation]; !ok {
		return fmt.Errorf("rotate: invalid interpolation value")
	}
	return nil
}

func (f Brightness) Validate() error {
	if f.Percentage < -100 || f.Percentage > 100 {
		return fmt.Errorf("brightness: percentage must be between -100 and 100")
	}
	return nil
}

func (f Contrast) Validate() error {
	if f.Percentage < -100 || f.Percentage > 100 {
		return fmt.Errorf("contrast: percentage must be between -100 and 100")
	}
	return nil
}

func (f Saturation) Validate() error {
	if f.Percentage < -100 || f.Percentage > 100 {
		return fmt.Errorf("saturation: percentage must be between -100 and 100")
	}
	return nil
}

func (f Gamma) Validate() error {
	if f.Gamma <= 0 {
		return fmt.Errorf("gamma: must be greater than zero")
	}
	return nil
}

func (f GaussianBlur) Validate() error {
	if f.Sigma <= 0 {
		return fmt.Errorf("gaussianblur: sigma must be greater than zero")
	}
	return nil
}

func (f UnsharpMask) Validate() error {
	if f.Sigma <= 0 || f.Amount < 0 || f.Threshold < 0 {
		return fmt.Errorf("unsharpmask: sigma must be > 0, amount and threshold >= 0")
	}
	return nil
}

func (f Sigmoid) Validate() error {
	if f.Contrast <= 0 || f.Midpoint < 0 || f.Midpoint > 1 {
		return fmt.Errorf("sigmoid: contrast must be > 0, midpoint must be between 0 and 1")
	}
	return nil
}

func (f Pixelate) Validate() error {
	if f.Size <= 0 {
		return fmt.Errorf("pixelate: size must be greater than zero")
	}
	return nil
}

func (f Colorize) Validate() error {
	if f.Hue < 0 || f.Hue > 360 {
		return fmt.Errorf("colorize: hue must be between 0 and 360")
	}
	if f.Saturation < 0 || f.Saturation > 1 {
		return fmt.Errorf("colorize: saturation must be between 0 and 1")
	}
	if f.Value < 0 || f.Value > 1 {
		return fmt.Errorf("colorize: value must be between 0 and 1")
	}
	return nil
}

func (f Sepia) Validate() error {
	if f.Percentage < 0 || f.Percentage > 100 {
		return fmt.Errorf("sepia: percentage must be between 0 and 100")
	}
	return nil
}

func (f Mean) Validate() error {
	if f.Radius <= 0 {
		return fmt.Errorf("mean: radius must be greater than zero")
	}
	return nil
}

func (f Median) Validate() error {
	if f.Radius <= 0 {
		return fmt.Errorf("median: radius must be greater than zero")
	}
	return nil
}

func (f Minimum) Validate() error {
	if f.Radius <= 0 {
		return fmt.Errorf("minimum: radius must be greater than zero")
	}
	return nil
}

func (f Maximum) Validate() error {
	if f.Radius <= 0 {
		return fmt.Errorf("maximum: radius must be greater than zero")
	}
	return nil
}

func (f Hue) Validate() error {
	if f.Angle < -360 || f.Angle > 360 {
		return fmt.Errorf("hue: angle must be between -360 and 360")
	}
	return nil
}

func (f ColorBalance) Validate() error {
	if f.Red < -1 || f.Red > 1 || f.Green < -1 || f.Green > 1 || f.Blue < -1 || f.Blue > 1 {
		return fmt.Errorf("colorbalance: each channel must be between -1 and 1")
	}
	return nil
}

// Filters sin parámetros
func (f Grayscale) Validate() error     { return nil }
func (f Invert) Validate() error        { return nil }
func (f Rotate180) Validate() error     { return nil }
func (f ScanifyFilter) Validate() error { return nil }
