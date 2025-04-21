function destroyCropperInstance(cropperInstance) {
  if (cropperInstance) {
    try {
      cropperInstance.destroy();
    } catch (e) {
    }
  }
  return null;
}

export { destroyCropperInstance as d };
//# sourceMappingURL=cropperUtils-Cy5Ckuh7.js.map
